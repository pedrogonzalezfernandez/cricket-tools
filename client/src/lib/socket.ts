import { io, Socket } from "socket.io-client";
import type { AppState, PlayerUpdate, ConductorPresence, PlayerState } from "@shared/schema";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

// Clock sync utilities
let serverTimeOffset = 0;

export function getServerTimeOffset(): number {
  return serverTimeOffset;
}

export function setServerTimeOffset(offset: number): void {
  serverTimeOffset = offset;
}

export function getEstimatedServerTime(): number {
  return Date.now() + serverTimeOffset;
}

// Perform clock sync with server
export async function performClockSync(socket: Socket): Promise<number> {
  return new Promise((resolve) => {
    const clientTime = Date.now();
    socket.emit("syncPing", { clientTime });
    
    socket.once("syncPong", (data: { clientTime: number; serverTime: number }) => {
      const now = Date.now();
      const roundTrip = now - data.clientTime;
      const estimatedServerTime = data.serverTime + roundTrip / 2;
      const offset = estimatedServerTime - now;
      setServerTimeOffset(offset);
      resolve(offset);
    });
  });
}

export type { AppState, PlayerUpdate, ConductorPresence, PlayerState };
