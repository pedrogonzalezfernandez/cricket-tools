import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket, connectSocket, performClockSync, getEstimatedServerTime } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { AppState, PlayerUpdate, ConductorPresence, PlayerState } from "@shared/schema";

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  serverTimeOffset: number;
  getServerTime: () => number;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  useEffect(() => {
    const s = connectSocket();
    setSocket(s);

    const onConnect = () => {
      setIsConnected(true);
      performClockSync(s).then(setServerTimeOffset);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    if (s.connected) {
      setIsConnected(true);
      performClockSync(s).then(setServerTimeOffset);
    }

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, []);

  const getServerTime = useCallback(() => {
    return getEstimatedServerTime();
  }, []);

  return { socket, isConnected, serverTimeOffset, getServerTime };
}

// Hook for player-specific socket events
interface UsePlayerSocketReturn {
  conductorPresent: boolean;
  playerUpdate: PlayerUpdate | null;
  joinAsPlayer: (name: string) => void;
  isJoined: boolean;
}

export function usePlayerSocket(socket: Socket | null): UsePlayerSocketReturn {
  const [conductorPresent, setConductorPresent] = useState(false);
  const [playerUpdate, setPlayerUpdate] = useState<PlayerUpdate | null>(null);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onConductorPresence = (data: ConductorPresence) => {
      setConductorPresent(data.present);
    };

    const onPlayerUpdate = (data: PlayerUpdate) => {
      setPlayerUpdate(data);
    };

    const onPlayerState = (data: { pitch: number; interval: number; conductorPresent: boolean; scene: string; phaseStartServerTime: number }) => {
      setConductorPresent(data.conductorPresent);
      setPlayerUpdate({
        pitch: data.pitch,
        interval: data.interval,
        scene: data.scene,
        phaseStartServerTime: data.phaseStartServerTime,
      });
      setIsJoined(true);
    };

    socket.on("conductorPresence", onConductorPresence);
    socket.on("playerUpdate", onPlayerUpdate);
    socket.on("playerState", onPlayerState);

    return () => {
      socket.off("conductorPresence", onConductorPresence);
      socket.off("playerUpdate", onPlayerUpdate);
      socket.off("playerState", onPlayerState);
    };
  }, [socket]);

  const joinAsPlayer = useCallback((name: string) => {
    if (socket) {
      socket.emit("joinPlayer", { name });
    }
  }, [socket]);

  return { conductorPresent, playerUpdate, joinAsPlayer, isJoined };
}

// Hook for conductor-specific socket events
interface UseConductorSocketReturn {
  players: Record<string, PlayerState>;
  currentScene: string;
  joinAsConductor: () => void;
  setPlayerPitch: (playerId: string, pitch: number) => void;
  setPlayerInterval: (playerId: string, interval: number) => void;
  setScene: (scene: string) => void;
  isJoined: boolean;
}

export function useConductorSocket(socket: Socket | null): UseConductorSocketReturn {
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [currentScene, setCurrentScene] = useState("audioScore");
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onStateUpdate = (data: AppState) => {
      setPlayers(data.players);
      setCurrentScene(data.currentScene);
    };

    const onFullState = (data: AppState) => {
      setPlayers(data.players);
      setCurrentScene(data.currentScene);
      setIsJoined(true);
    };

    socket.on("stateUpdate", onStateUpdate);
    socket.on("fullState", onFullState);

    return () => {
      socket.off("stateUpdate", onStateUpdate);
      socket.off("fullState", onFullState);
    };
  }, [socket]);

  const joinAsConductor = useCallback(() => {
    if (socket) {
      socket.emit("joinConductor");
    }
  }, [socket]);

  const setPlayerPitch = useCallback((playerId: string, pitch: number) => {
    if (socket) {
      socket.emit("setPlayerPitch", { playerId, pitch });
    }
  }, [socket]);

  const setPlayerInterval = useCallback((playerId: string, interval: number) => {
    if (socket) {
      socket.emit("setPlayerInterval", { playerId, interval });
    }
  }, [socket]);

  const setScene = useCallback((scene: string) => {
    if (socket) {
      socket.emit("setScene", { scene });
    }
  }, [socket]);

  return { players, currentScene, joinAsConductor, setPlayerPitch, setPlayerInterval, setScene, isJoined };
}
