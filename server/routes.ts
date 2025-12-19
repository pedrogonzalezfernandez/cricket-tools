import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { PlayerState, AppState } from "@shared/schema";
import { Server as OscServer } from "node-osc";

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

  // OSC Server setup
  const OSC_PORT = 9000;
  const oscServer = new OscServer(OSC_PORT, "127.0.0.1");

  oscServer.on("message", (msg: any[]) => {
    const address = msg[0];
    
    if (address === "/conductor") {
      const target = typeof msg[1] === "number" ? msg[1] : parseInt(msg[1]);
      const control = typeof msg[2] === "number" ? msg[2] : parseInt(msg[2]);
      const value = typeof msg[3] === "number" ? msg[3] : parseFloat(msg[3]);

      if (isNaN(target) || isNaN(control) || isNaN(value)) {
        console.log(`OSC ignored: invalid arguments - target=${msg[1]}, control=${msg[2]}, value=${msg[3]}`);
        return;
      }

      // Control codes:
      // 1 = pitch
      // 2 = interval (ms)
      // 100 = scene (global)

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
      } else if (target === -1) {
        // Apply to all players
        const playerIds = getAllPlayerIds();
        let appliedCount = 0;

        playerIds.forEach((playerId) => {
          const socketId = getSocketIdFromPlayerId(playerId);
          if (!socketId) return;

          if (control === 1) {
            // Pitch
            if (setPlayerPitch(socketId, Math.floor(value))) {
              appliedCount++;
            }
          } else if (control === 2) {
            // Interval
            if (setPlayerInterval(socketId, Math.floor(value))) {
              appliedCount++;
            }
          }
        });

        if (appliedCount > 0) {
          console.log(`OSC applied: target=-1 (all ${appliedCount} players), control=${control}, value=${value}`);
        }
      } else if (target > 0) {
        // Specific player
        const socketId = getSocketIdFromPlayerId(target);
        if (!socketId) {
          console.log(`OSC ignored: player ${target} not connected`);
          return;
        }

        if (control === 1) {
          // Pitch
          if (setPlayerPitch(socketId, Math.floor(value))) {
            console.log(`OSC applied: target=${target}, control=1 (pitch), value=${Math.floor(value)}`);
          }
        } else if (control === 2) {
          // Interval
          if (setPlayerInterval(socketId, Math.floor(value))) {
            console.log(`OSC applied: target=${target}, control=2 (interval), value=${Math.floor(value)}`);
          }
        }
      }
    }
  });

  oscServer.on("error", (err: Error) => {
    console.error("OSC Server error:", err);
  });

  console.log(`OSC server listening on 127.0.0.1:${OSC_PORT}`);

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
    });
  });

  return httpServer;
}
