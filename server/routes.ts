import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { PlayerState, AppState, Mp3Slot, Mp3SyncState, Mp3PlayState, Mp3PlayerReady } from "@shared/schema";
import { MAX_SLOTS } from "@shared/schema";
import { resolveControl } from "@shared/controls";
import * as dgram from "dgram";
import multer from "multer";
import path from "path";
import fs from "fs";

// In-memory state
const players: Record<string, PlayerState> = {};
let conductorCount = 0;
let currentScene = "audioScore";
const defaults = {
  pitch: 69, // A4 MIDI note
  interval: 1000, // 1 second
};
let globalPhaseStartServerTime = Date.now();

// Stable player ID management
let nextPlayerId = 1;
const playerIdToSocketId: Map<number, string> = new Map();
const socketIdToPlayerId: Map<string, number> = new Map();

// Scene definitions for OSC numeric control
const SCENES = ["audioScore"]; // Index 0 = audioScore, add more as needed

// ========== MP3 Sync Tool State ==========
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// File storage: fileId -> { filePath, fileName }
const fileStorage: Map<string, { filePath: string; fileName: string }> = new Map();

// Initialize MP3 slots
const mp3Slots: Mp3Slot[] = [];
for (let i = 0; i < MAX_SLOTS; i++) {
  mp3Slots.push({
    slotIndex: i,
    playerSocketId: null,
    playerName: null,
    fileId: null,
    fileName: null,
    ready: false,
    duration: null,
  });
}

// MP3 playback state
let mp3PlayState: Mp3PlayState | null = null;

// MP3 player sockets (separate from synth tool players)
const mp3PlayerSockets = new Set<string>();
const mp3ConductorSockets = new Set<string>();

function getMp3SyncState(): Mp3SyncState {
  return {
    slots: mp3Slots,
    playState: mp3PlayState,
  };
}

function findLowestFreeSlot(): number {
  for (let i = 0; i < MAX_SLOTS; i++) {
    if (mp3Slots[i].playerSocketId === null) {
      return i;
    }
  }
  return -1;
}

function deleteFileFromDisk(fileId: string): void {
  const fileInfo = fileStorage.get(fileId);
  if (fileInfo) {
    try {
      if (fs.existsSync(fileInfo.filePath)) {
        fs.unlinkSync(fileInfo.filePath);
        console.log(`Deleted file from disk: ${fileInfo.fileName} (${fileId})`);
      }
    } catch (err) {
      console.error(`Failed to delete file ${fileId}:`, err);
    }
    fileStorage.delete(fileId);
  }
}

function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get full state for conductors
function getFullState(): AppState {
  return {
    players,
    conductorCount,
    currentScene,
    defaults,
    phaseStartServerTime: globalPhaseStartServerTime,
  };
}

// Check if any conductor is present
function hasConductor(): boolean {
  return conductorCount > 0;
}

// Get socket ID from player ID
function getSocketIdFromPlayerId(playerId: number): string | undefined {
  return playerIdToSocketId.get(playerId);
}

// Get all connected player IDs
function getAllPlayerIds(): number[] {
  return Array.from(playerIdToSocketId.keys());
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Track which sockets are players vs conductors
  const playerSockets = new Set<string>();
  const conductorSockets = new Set<string>();

  // Helper function to set player pitch (used by both socket and OSC)
  function setPlayerPitch(socketId: string, pitch: number): boolean {
    if (!players[socketId]) return false;
    if (pitch < 36 || pitch > 84) return false;

    players[socketId].pitch = pitch;

    io.to(socketId).emit("playerUpdate", {
      pitch: players[socketId].pitch,
      interval: players[socketId].interval,
      scene: currentScene,
      phaseStartServerTime: players[socketId].phaseStartServerTime,
    });

    io.to("conductors").emit("stateUpdate", getFullState());
    return true;
  }

  // Helper function to set player interval (used by both socket and OSC)
  function setPlayerInterval(socketId: string, newInterval: number): boolean {
    if (!players[socketId]) return false;
    if (newInterval < 50 || newInterval > 3000) return false;

    const player = players[socketId];
    const now = Date.now();
    const oldInterval = player.interval;

    // Calculate current phase position (0 to 1)
    const elapsed = now - player.phaseStartServerTime;
    const currentPhase = ((elapsed % oldInterval) + oldInterval) % oldInterval / oldInterval;

    // Calculate new phaseStartServerTime to preserve phase position
    const newPhaseStart = now - (currentPhase * newInterval);

    player.interval = newInterval;
    player.phaseStartServerTime = newPhaseStart;

    io.to(socketId).emit("playerUpdate", {
      pitch: player.pitch,
      interval: player.interval,
      scene: currentScene,
      phaseStartServerTime: player.phaseStartServerTime,
    });

    io.to("conductors").emit("stateUpdate", getFullState());
    return true;
  }

  // Helper function to set scene (used by both socket and OSC)
  function setScene(scene: string): boolean {
    if (!scene || typeof scene !== "string") return false;
    if (!SCENES.includes(scene)) return false;

    currentScene = scene;
    const now = Date.now();
    globalPhaseStartServerTime = now;

    // Reset all player phases when scene changes
    Object.keys(players).forEach((playerId) => {
      players[playerId].phaseStartServerTime = now;
    });

    // Notify all players
    Object.keys(players).forEach((playerId) => {
      const player = players[playerId];
      io.to(playerId).emit("playerUpdate", {
        pitch: player.pitch,
        interval: player.interval,
        scene: currentScene,
        phaseStartServerTime: player.phaseStartServerTime,
      });
    });

    io.to("conductors").emit("stateUpdate", getFullState());
    return true;
  }

  // UDP/OSC Server setup - supports both raw text and binary OSC
  const OSC_PORT = 9000;
  const udpServer = dgram.createSocket("udp4");

  // Parse OSC binary format
  function parseOscBinary(buffer: Buffer): { address: string; args: number[] } | null {
    try {
      // Read null-terminated address string
      let offset = 0;
      let addressEnd = buffer.indexOf(0, offset);
      if (addressEnd === -1) return null;
      
      const address = buffer.toString("ascii", offset, addressEnd);
      if (!address.startsWith("/")) return null;
      
      // Skip to 4-byte boundary
      offset = Math.ceil((addressEnd + 1) / 4) * 4;
      
      // Read type tag string (starts with ,)
      if (buffer[offset] !== 44) return null; // 44 = ','
      
      let typeTagEnd = buffer.indexOf(0, offset);
      if (typeTagEnd === -1) return null;
      
      const typeTag = buffer.toString("ascii", offset + 1, typeTagEnd);
      offset = Math.ceil((typeTagEnd + 1) / 4) * 4;
      
      // Parse arguments based on type tags
      const args: number[] = [];
      for (const t of typeTag) {
        if (t === "i") {
          // 32-bit int (big-endian)
          args.push(buffer.readInt32BE(offset));
          offset += 4;
        } else if (t === "f") {
          // 32-bit float (big-endian)
          args.push(buffer.readFloatBE(offset));
          offset += 4;
        }
      }
      
      return { address, args };
    } catch {
      return null;
    }
  }

  // Parse raw text format: "/conductor 1 2 500" or "/ conductor 0. 0. 1789."
  function parseRawText(text: string): { address: string; args: number[] } | null {
    try {
      // Handle Max's format which may have "/ conductor" (space after /)
      // or "/conductor" (no space)
      const cleaned = text.trim().replace(/\s+/g, " ");
      const parts = cleaned.split(" ");
      
      if (parts.length < 1) return null;
      
      // Find the address (starts with /)
      let address = "";
      let argStart = 0;
      
      if (parts[0] === "/") {
        // Format: "/ conductor 0 0 1789"
        address = "/" + parts[1];
        argStart = 2;
      } else if (parts[0].startsWith("/")) {
        // Format: "/conductor 0 0 1789"
        address = parts[0];
        argStart = 1;
      } else {
        return null;
      }
      
      // Parse numeric arguments (handle trailing dots from Max floats: "0." "1789.")
      const args: number[] = [];
      for (let i = argStart; i < parts.length; i++) {
        let numStr = parts[i].replace(/\.$/g, ""); // Remove trailing dot
        const num = parseFloat(numStr);
        if (!isNaN(num)) {
          args.push(num);
        }
      }
      
      return { address, args };
    } catch {
      return null;
    }
  }

  // Handle OSC command - uses the control registry
  function handleOscCommand(address: string, args: number[]) {
    if (address !== "/conductor") return;
    if (args.length < 3) {
      console.log(`OSC ignored: need 3 arguments, got ${args.length}`);
      return;
    }

    const target = Math.floor(args[0]);
    const control = Math.floor(args[1]);
    const value = args[2];

    // Control 100 = scene (global only, reserved)
    if (target === 0) {
      // Global controls
      if (control === 100) {
        // Scene selection
        const sceneIndex = Math.floor(value);
        if (sceneIndex >= 0 && sceneIndex < SCENES.length) {
          const sceneName = SCENES[sceneIndex];
          if (setScene(sceneName)) {
            console.log(`OSC applied: target=0 (global), control=100 (scene), value=${sceneIndex} (${sceneName})`);
          }
        } else {
          console.log(`OSC ignored: invalid scene index ${sceneIndex}`);
        }
      }
      return;
    }

    // Resolve control using registry for player controls
    const controlDef = resolveControl(currentScene, control);
    if (!controlDef) {
      console.log(`OSC ignored: unknown control ${control} for scene ${currentScene}`);
      return;
    }

    const controlName = controlDef.name;

    // Helper to apply control
    const applyControl = (socketId: string): boolean => {
      if (controlName === "pitch") {
        return setPlayerPitch(socketId, Math.floor(value));
      } else if (controlName === "interval") {
        return setPlayerInterval(socketId, Math.floor(value));
      }
      return false;
    };

    if (target === -1) {
      // Apply to all players
      const playerIds = getAllPlayerIds();
      let appliedCount = 0;

      playerIds.forEach((playerId) => {
        const socketId = getSocketIdFromPlayerId(playerId);
        if (!socketId) return;
        if (applyControl(socketId)) appliedCount++;
      });

      if (appliedCount > 0) {
        console.log(`OSC applied: target=-1 (all ${appliedCount} players), control=${controlDef.id} (${controlName}), value=${value}`);
      }
    } else if (target > 0) {
      // Specific player
      const socketId = getSocketIdFromPlayerId(target);
      if (!socketId) {
        console.log(`OSC ignored: player ${target} not connected`);
        return;
      }

      if (applyControl(socketId)) {
        console.log(`OSC applied: target=${target}, control=${controlDef.id} (${controlName}), value=${Math.floor(value)}`);
      }
    }
  }

  udpServer.on("message", (msg: Buffer) => {
    // Try parsing as binary OSC first
    let parsed = parseOscBinary(msg);
    
    if (!parsed) {
      // Fall back to raw text parsing
      const text = msg.toString("utf8");
      parsed = parseRawText(text);
    }
    
    if (parsed) {
      handleOscCommand(parsed.address, parsed.args);
    } else {
      console.log(`OSC ignored: could not parse message`);
    }
  });

  udpServer.on("error", (err: Error) => {
    console.error("UDP/OSC Server error:", err);
  });

  udpServer.bind(OSC_PORT, "127.0.0.1", () => {
    console.log(`UDP/OSC server listening on 127.0.0.1:${OSC_PORT} (supports binary OSC and raw text)`);
  });

  // ========== MP3 Sync HTTP Endpoints ==========
  const upload = multer({
    storage: multer.diskStorage({
      destination: UPLOADS_DIR,
      filename: (req, file, cb) => {
        const fileId = generateFileId();
        const ext = path.extname(file.originalname);
        cb(null, `${fileId}${ext}`);
      },
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "audio/mpeg" || file.originalname.toLowerCase().endsWith(".mp3")) {
        cb(null, true);
      } else {
        cb(new Error("Only MP3 files are allowed"));
      }
    },
  });

  app.post("/api/upload/slot/:slotIndex", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File too large (max 15MB)" });
        }
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
  }, (req, res) => {
    const slotIndex = parseInt(req.params.slotIndex, 10);
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= MAX_SLOTS) {
      return res.status(400).json({ error: "Invalid slot index" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const oldFileId = mp3Slots[slotIndex].fileId;
    if (oldFileId) {
      deleteFileFromDisk(oldFileId);
    }

    const safeFileName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileId = path.basename(req.file.filename, path.extname(req.file.filename));

    fileStorage.set(fileId, { filePath: req.file.path, fileName: safeFileName });

    mp3Slots[slotIndex].fileId = fileId;
    mp3Slots[slotIndex].fileName = safeFileName;
    mp3Slots[slotIndex].ready = false;
    mp3Slots[slotIndex].duration = null;

    console.log(`MP3 uploaded for slot ${slotIndex}: ${safeFileName} (${fileId})`);

    io.to("mp3conductors").emit("mp3StateUpdate", getMp3SyncState());

    const playerSocketId = mp3Slots[slotIndex].playerSocketId;
    if (playerSocketId) {
      io.to(playerSocketId).emit("mp3Assignment", {
        slotIndex,
        fileId,
        fileName: safeFileName,
      });
    }

    res.json({ fileId, fileName: safeFileName, slotIndex });
  });

  app.get("/api/files/:fileId", (req, res) => {
    const fileId = req.params.fileId;
    
    if (!fileId || fileId.includes("..") || fileId.includes("/") || fileId.includes("\\")) {
      return res.status(400).json({ error: "Invalid file ID" });
    }
    
    const fileInfo = fileStorage.get(fileId);

    if (!fileInfo) {
      return res.status(404).json({ error: "File not found" });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `inline; filename="${fileInfo.fileName}"`);
    res.sendFile(fileInfo.filePath);
  });

  app.delete("/api/slot/:slotIndex/file", (req, res) => {
    const slotIndex = parseInt(req.params.slotIndex, 10);
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= MAX_SLOTS) {
      return res.status(400).json({ error: "Invalid slot index" });
    }

    const slot = mp3Slots[slotIndex];
    const fileId = slot.fileId;
    
    if (!fileId) {
      return res.status(404).json({ error: "No file in this slot" });
    }

    deleteFileFromDisk(fileId);

    slot.fileId = null;
    slot.fileName = null;
    slot.ready = false;
    slot.duration = null;

    console.log(`MP3 deleted from slot ${slotIndex}`);

    io.to("mp3conductors").emit("mp3StateUpdate", getMp3SyncState());

    if (slot.playerSocketId) {
      io.to(slot.playerSocketId).emit("mp3FileRemoved", { slotIndex });
    }

    res.json({ success: true, slotIndex });
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Clock sync
    socket.on("syncPing", (data: { clientTime: number }) => {
      socket.emit("syncPong", {
        clientTime: data.clientTime,
        serverTime: Date.now(),
      });
    });

    // Player joins
    socket.on("joinPlayer", (data: { name: string }) => {
      if (!data.name || typeof data.name !== "string") {
        return;
      }

      playerSockets.add(socket.id);
      socket.join("players");

      const now = Date.now();

      // Assign stable numeric player ID
      const playerId = nextPlayerId++;
      playerIdToSocketId.set(playerId, socket.id);
      socketIdToPlayerId.set(socket.id, playerId);

      // Create player state with defaults
      players[socket.id] = {
        playerId,
        socketId: socket.id,
        name: data.name.slice(0, 50),
        pitch: defaults.pitch,
        interval: defaults.interval,
        phaseStartServerTime: now,
      };

      // Send player their initial state
      socket.emit("playerState", {
        pitch: players[socket.id].pitch,
        interval: players[socket.id].interval,
        conductorPresent: hasConductor(),
        scene: currentScene,
        phaseStartServerTime: players[socket.id].phaseStartServerTime,
      });

      // Update all conductors
      io.to("conductors").emit("stateUpdate", getFullState());

      console.log(`Player joined: ${playerId} - ${data.name} (${socket.id})`);
    });

    // Conductor joins
    socket.on("joinConductor", () => {
      conductorSockets.add(socket.id);
      conductorCount++;
      socket.join("conductors");

      // Send conductor the full state
      socket.emit("fullState", getFullState());

      // Notify all players that a conductor is now present
      if (conductorCount === 1) {
        globalPhaseStartServerTime = Date.now();
        io.to("players").emit("conductorPresence", { present: true });

        // Send current state to all players
        Object.keys(players).forEach((playerId) => {
          const player = players[playerId];
          io.to(playerId).emit("playerUpdate", {
            pitch: player.pitch,
            interval: player.interval,
            scene: currentScene,
            phaseStartServerTime: player.phaseStartServerTime,
          });
        });
      }

      // Also update all conductors
      io.to("conductors").emit("stateUpdate", getFullState());

      console.log(`Conductor joined (${socket.id}). Total conductors: ${conductorCount}`);
    });

    // Conductor sets player pitch
    socket.on("setPlayerPitch", (data: { playerId: string; pitch: number }) => {
      if (!conductorSockets.has(socket.id)) return;
      if (!data.playerId || typeof data.pitch !== "number") return;

      setPlayerPitch(data.playerId, data.pitch);
    });

    // Conductor sets player interval
    socket.on("setPlayerInterval", (data: { playerId: string; interval: number }) => {
      if (!conductorSockets.has(socket.id)) return;
      if (!data.playerId || typeof data.interval !== "number") return;

      setPlayerInterval(data.playerId, data.interval);
    });

    // Conductor sets scene
    socket.on("setScene", (data: { scene: string }) => {
      if (!conductorSockets.has(socket.id)) return;

      setScene(data.scene);
    });

    // Max/MSP command handler - accepts player number instead of socketId
    // Format: { target: playerNumber, control: number | string, value: number }
    // target: 0 = ignored, -1 = all players, 1+ = specific player
    // control: can be numeric ID (1=pitch, 2=interval) or string name ("pitch", "interval")
    socket.on("maxCommand", (data: { target: number; control: number | string; value: number }) => {
      if (!conductorSockets.has(socket.id)) return;
      
      const { target, control, value } = data;
      
      if (typeof target !== "number" || typeof value !== "number") {
        console.log("maxCommand ignored: invalid data format");
        return;
      }

      if (typeof control !== "number" && typeof control !== "string") {
        console.log("maxCommand ignored: control must be number or string");
        return;
      }

      // Resolve control using the registry (supports both ID and name)
      const controlDef = resolveControl(currentScene, control);
      if (!controlDef) {
        console.log(`maxCommand ignored: unknown control ${control} for scene ${currentScene}`);
        return;
      }

      const controlName = controlDef.name;

      // Helper to apply control to a socket
      const applyControl = (socketId: string): boolean => {
        if (controlName === "pitch") {
          return setPlayerPitch(socketId, Math.floor(value));
        } else if (controlName === "interval") {
          return setPlayerInterval(socketId, Math.floor(value));
        }
        return false;
      };

      if (target === -1) {
        // Apply to all players
        const playerIds = getAllPlayerIds();
        let appliedCount = 0;

        playerIds.forEach((playerId) => {
          const socketId = getSocketIdFromPlayerId(playerId);
          if (!socketId) return;
          if (applyControl(socketId)) appliedCount++;
        });

        if (appliedCount > 0) {
          console.log(`maxCommand applied: target=-1 (all ${appliedCount} players), control=${controlDef.id} (${controlName}), value=${value}`);
        }
      } else if (target > 0) {
        // Specific player by number
        const socketId = getSocketIdFromPlayerId(target);
        if (!socketId) {
          console.log(`maxCommand ignored: player ${target} not connected`);
          return;
        }

        if (applyControl(socketId)) {
          console.log(`maxCommand applied: target=${target}, control=${controlDef.id} (${controlName}), value=${Math.floor(value)}`);
        }
      }
    });

    // ========== MP3 Sync Socket Events ==========

    socket.on("joinMp3Player", (data: { name: string }) => {
      if (!data.name || typeof data.name !== "string") {
        socket.emit("mp3JoinError", { error: "Invalid name" });
        return;
      }

      const slotIndex = findLowestFreeSlot();
      if (slotIndex === -1) {
        socket.emit("mp3JoinError", { error: "No slots available" });
        return;
      }

      mp3PlayerSockets.add(socket.id);
      socket.join("mp3players");

      mp3Slots[slotIndex].playerSocketId = socket.id;
      mp3Slots[slotIndex].playerName = data.name.slice(0, 50);
      mp3Slots[slotIndex].ready = false;

      socket.emit("mp3JoinSuccess", {
        slotIndex,
        fileId: mp3Slots[slotIndex].fileId,
        fileName: mp3Slots[slotIndex].fileName,
      });

      io.to("mp3conductors").emit("mp3StateUpdate", getMp3SyncState());

      console.log(`MP3 Player joined: slot ${slotIndex} - ${data.name} (${socket.id})`);

      if (mp3PlayState && mp3PlayState.playing && mp3Slots[slotIndex].fileId) {
        const currentPlayheadSeconds =
          mp3PlayState.seekSeconds + (Date.now() - mp3PlayState.serverStartTimeMs) / 1000;
        
        socket.emit("mp3Play", {
          playId: mp3PlayState.playId,
          serverStartTimeMs: Date.now() + 500,
          seekSeconds: currentPlayheadSeconds,
          slotIndex,
          fileId: mp3Slots[slotIndex].fileId,
        });
      }
    });

    socket.on("joinMp3Conductor", () => {
      mp3ConductorSockets.add(socket.id);
      socket.join("mp3conductors");

      socket.emit("mp3FullState", getMp3SyncState());

      console.log(`MP3 Conductor joined (${socket.id})`);
    });

    socket.on("mp3Ready", (data: Mp3PlayerReady) => {
      if (!mp3PlayerSockets.has(socket.id)) return;

      const slot = mp3Slots.find(s => s.playerSocketId === socket.id);
      if (!slot) return;

      if (slot.slotIndex === data.slotIndex && slot.fileId === data.fileId) {
        slot.ready = data.ready;
        slot.duration = data.duration;

        io.to("mp3conductors").emit("mp3StateUpdate", getMp3SyncState());
        console.log(`MP3 Player ready: slot ${data.slotIndex}, duration ${data.duration}s`);
      }
    });

    socket.on("mp3Play", (data: { seekSeconds: number }) => {
      if (!mp3ConductorSockets.has(socket.id)) return;

      const playId = generateFileId();
      const serverStartTimeMs = Date.now() + 2000;
      const seekSeconds = data.seekSeconds || 0;

      mp3PlayState = {
        playing: true,
        playId,
        serverStartTimeMs,
        seekSeconds,
      };

      mp3Slots.forEach((slot) => {
        if (slot.playerSocketId && slot.fileId) {
          io.to(slot.playerSocketId).emit("mp3Play", {
            playId,
            serverStartTimeMs,
            seekSeconds,
            slotIndex: slot.slotIndex,
            fileId: slot.fileId,
          });
        }
      });

      io.to("mp3conductors").emit("mp3StateUpdate", getMp3SyncState());
      console.log(`MP3 Play started: playId=${playId}, seek=${seekSeconds}s`);
    });

    socket.on("mp3Stop", () => {
      if (!mp3ConductorSockets.has(socket.id)) return;

      if (mp3PlayState) {
        const playId = mp3PlayState.playId;
        mp3PlayState = null;

        io.to("mp3players").emit("mp3Stop", { playId });
        io.to("mp3conductors").emit("mp3StateUpdate", getMp3SyncState());

        console.log(`MP3 Play stopped: playId=${playId}`);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      // If it was a player
      if (playerSockets.has(socket.id)) {
        playerSockets.delete(socket.id);

        // Clean up player ID mapping
        const playerId = socketIdToPlayerId.get(socket.id);
        if (playerId !== undefined) {
          playerIdToSocketId.delete(playerId);
          socketIdToPlayerId.delete(socket.id);
        }

        delete players[socket.id];

        // Update all conductors
        io.to("conductors").emit("stateUpdate", getFullState());
      }

      // If it was a conductor
      if (conductorSockets.has(socket.id)) {
        conductorSockets.delete(socket.id);
        conductorCount = Math.max(0, conductorCount - 1);
        socket.leave("conductors");

        // If last conductor left, notify all players
        if (conductorCount === 0) {
          io.to("players").emit("conductorPresence", { present: false });
        }

        // Update remaining conductors
        io.to("conductors").emit("stateUpdate", getFullState());

        console.log(`Conductor left. Remaining conductors: ${conductorCount}`);
      }

      // If it was an MP3 player
      if (mp3PlayerSockets.has(socket.id)) {
        mp3PlayerSockets.delete(socket.id);

        // Free the slot but keep file assignment
        const slot = mp3Slots.find(s => s.playerSocketId === socket.id);
        if (slot) {
          console.log(`MP3 Player disconnected: slot ${slot.slotIndex} - ${slot.playerName}`);
          slot.playerSocketId = null;
          slot.playerName = null;
          slot.ready = false;
          // Keep fileId and fileName for the slot
        }

        io.to("mp3conductors").emit("mp3StateUpdate", getMp3SyncState());
      }

      // If it was an MP3 conductor
      if (mp3ConductorSockets.has(socket.id)) {
        mp3ConductorSockets.delete(socket.id);
        console.log(`MP3 Conductor left (${socket.id})`);
      }
    });
  });

  return httpServer;
}
