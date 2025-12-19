import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { PlayerState, AppState } from "@shared/schema";

// In-memory state
const players: Record<string, PlayerState> = {};
let conductorCount = 0;
let currentScene = "audioScore";
const defaults = {
  pitch: 69, // A4 MIDI note
  interval: 1000, // 1 second
};
let phaseStartServerTime = Date.now();

// Get full state for conductors
function getFullState(): AppState {
  return {
    players,
    conductorCount,
    currentScene,
    defaults,
    phaseStartServerTime,
  };
}

// Check if any conductor is present
function hasConductor(): boolean {
  return conductorCount > 0;
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
      socket.join("players"); // Join players room for broadcast
      
      // Create player state with defaults
      players[socket.id] = {
        socketId: socket.id,
        name: data.name.slice(0, 50),
        pitch: defaults.pitch,
        interval: defaults.interval,
      };

      // Send player their initial state
      socket.emit("playerState", {
        pitch: players[socket.id].pitch,
        interval: players[socket.id].interval,
        conductorPresent: hasConductor(),
        scene: currentScene,
        phaseStartServerTime,
      });

      // Update all conductors
      io.to("conductors").emit("stateUpdate", getFullState());
      
      console.log(`Player joined: ${data.name} (${socket.id})`);
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
        phaseStartServerTime = Date.now();
        io.to("players").emit("conductorPresence", { present: true });
        
        // Send current state to all players
        Object.keys(players).forEach((playerId) => {
          const player = players[playerId];
          io.to(playerId).emit("playerUpdate", {
            pitch: player.pitch,
            interval: player.interval,
            scene: currentScene,
            phaseStartServerTime,
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
      if (data.pitch < 36 || data.pitch > 84) return;
      if (!players[data.playerId]) return;

      players[data.playerId].pitch = data.pitch;

      // Notify the specific player
      io.to(data.playerId).emit("playerUpdate", {
        pitch: players[data.playerId].pitch,
        interval: players[data.playerId].interval,
        scene: currentScene,
        phaseStartServerTime,
      });

      // Update all conductors
      io.to("conductors").emit("stateUpdate", getFullState());
    });

    // Conductor sets player interval
    socket.on("setPlayerInterval", (data: { playerId: string; interval: number }) => {
      if (!conductorSockets.has(socket.id)) return;
      if (!data.playerId || typeof data.interval !== "number") return;
      if (data.interval < 50 || data.interval > 3000) return;
      if (!players[data.playerId]) return;

      players[data.playerId].interval = data.interval;
      
      // Reset phase when interval changes for smoother sync
      phaseStartServerTime = Date.now();

      // Notify the specific player
      io.to(data.playerId).emit("playerUpdate", {
        pitch: players[data.playerId].pitch,
        interval: players[data.playerId].interval,
        scene: currentScene,
        phaseStartServerTime,
      });

      // Update all conductors
      io.to("conductors").emit("stateUpdate", getFullState());
    });

    // Conductor sets scene
    socket.on("setScene", (data: { scene: string }) => {
      if (!conductorSockets.has(socket.id)) return;
      if (!data.scene || typeof data.scene !== "string") return;

      currentScene = data.scene;
      phaseStartServerTime = Date.now();

      // Notify all players
      Object.keys(players).forEach((playerId) => {
        const player = players[playerId];
        io.to(playerId).emit("playerUpdate", {
          pitch: player.pitch,
          interval: player.interval,
          scene: currentScene,
          phaseStartServerTime,
        });
      });

      // Update all conductors
      io.to("conductors").emit("stateUpdate", getFullState());
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      // If it was a player
      if (playerSockets.has(socket.id)) {
        playerSockets.delete(socket.id);
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
