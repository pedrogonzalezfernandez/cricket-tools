# Audio Score - Real-Time Multi-User Conductor/Player App

## Overview
A real-time collaborative music application where Conductors control audio parameters for Players who receive personalized visual and audio scores.

## Current State
MVP complete with full functionality:
- Two user roles: Conductor and Player
- Real-time WebSocket communication via Socket.IO
- Audio synthesis using Tone.js
- Canvas-based circular score visualization
- Clock sync for aligned playback

## Architecture

### Frontend (React + Vite)
- `/` - Landing page with role selection
- `/player` - Player flow: name entry → waiting room → audio score
- `/conductor` - Dashboard with scene selector and per-player controls

### Backend (Express + Socket.IO)
- WebSocket server handles all real-time communication
- In-memory state management for players and conductors
- Clock synchronization for audio timing

### Key Components
- `client/src/pages/landing.tsx` - Role selection cards
- `client/src/pages/player.tsx` - Full player experience (name, waiting, audio score)
- `client/src/pages/conductor.tsx` - Dashboard with player controls
- `client/src/hooks/use-socket.ts` - Socket.IO hooks for both roles
- `server/routes.ts` - Socket.IO event handlers

## Data Model (shared/schema.ts)
- `PlayerState` - socketId, name, pitch (MIDI 36-84), interval (50-3000ms)
- `AppState` - players map, conductor count, current scene, defaults, phase start time

## Socket Events
- `joinPlayer({name})` / `joinConductor()` - Role registration
- `playerState` / `fullState` - Initial state on join
- `conductorPresence({present})` - Broadcast when conductors join/leave
- `playerUpdate({pitch, interval, scene, phaseStartServerTime})` - To specific player
- `stateUpdate(fullState)` - To all conductors
- `setPlayerPitch/setPlayerInterval/setScene` - Conductor controls
- `syncPing/syncPong` - Clock synchronization

## How to Test
1. Open two browser tabs
2. Tab 1: Enter as Conductor
3. Tab 2: Enter as Player, enter name, join
4. Player will wait until conductor is present
5. Once conductor joins, player can start audio
6. Conductor can adjust pitch/interval sliders for each player
7. Changes reflect immediately on player's audio and visual score

## Limitations
- Browser audio requires user gesture (player must click "Start Audio")
- In-memory state resets on server restart
- Scene 1 (Audio Score) only - future scenes planned

## User Preferences
- Clean, minimal UI following Apple HIG design
- Responsive layout for all screen sizes
- Real-time feedback with smooth animations
