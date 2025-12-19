import { z } from "zod";

// Player state managed by server
export interface PlayerState {
  playerId: number; // Stable numeric ID for OSC addressing
  socketId: string;
  name: string;
  pitch: number; // MIDI note number (36-84)
  interval: number; // milliseconds (50-3000)
  phaseStartServerTime: number; // Per-player phase start time
}

// Full application state
export interface AppState {
  players: Record<string, PlayerState>;
  conductorCount: number;
  currentScene: string;
  defaults: {
    pitch: number;
    interval: number;
  };
  phaseStartServerTime: number;
}

// Socket events schemas
export const joinPlayerSchema = z.object({
  name: z.string().min(1).max(50),
});

export const setPlayerPitchSchema = z.object({
  playerId: z.string(),
  pitch: z.number().min(36).max(84),
});

export const setPlayerIntervalSchema = z.object({
  playerId: z.string(),
  interval: z.number().min(50).max(3000),
});

export const setSceneSchema = z.object({
  scene: z.string(),
});

export const syncPingSchema = z.object({
  clientTime: z.number(),
});

export type JoinPlayerData = z.infer<typeof joinPlayerSchema>;
export type SetPlayerPitchData = z.infer<typeof setPlayerPitchSchema>;
export type SetPlayerIntervalData = z.infer<typeof setPlayerIntervalSchema>;
export type SetSceneData = z.infer<typeof setSceneSchema>;
export type SyncPingData = z.infer<typeof syncPingSchema>;

// Player update sent to individual player
export interface PlayerUpdate {
  pitch: number;
  interval: number;
  scene: string;
  phaseStartServerTime: number;
}

// Conductor presence broadcast
export interface ConductorPresence {
  present: boolean;
}

// Helper to convert MIDI note to note name
export function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

// Helper to convert MIDI to frequency
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
