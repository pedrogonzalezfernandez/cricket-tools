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
- OSC control for external applications (Max/MSP, etc.)

## Architecture

### Frontend (React + Vite)
- `/` - Landing page with role selection
- `/player` - Player flow: name entry → waiting room → audio score
- `/conductor` - Dashboard with scene selector and per-player controls

### Backend (Express + Socket.IO + OSC)
- WebSocket server handles all real-time communication
- In-memory state management for players and conductors
- Clock synchronization for audio timing
- OSC UDP server for external control

### Key Components
- `client/src/pages/landing.tsx` - Role selection cards
- `client/src/pages/player.tsx` - Full player experience (name, waiting, audio score)
- `client/src/pages/conductor.tsx` - Dashboard with player controls
- `client/src/hooks/use-socket.ts` - Socket.IO hooks for both roles
- `server/routes.ts` - Socket.IO event handlers + OSC listener

## Data Model (shared/schema.ts)
- `PlayerState` - playerId (numeric), socketId, name, pitch (MIDI 36-84), interval (50-3000ms), phaseStartServerTime
- `AppState` - players map, conductor count, current scene, defaults, phase start time

## Socket Events
- `joinPlayer({name})` / `joinConductor()` - Role registration
- `playerState` / `fullState` - Initial state on join
- `conductorPresence({present})` - Broadcast when conductors join/leave
- `playerUpdate({pitch, interval, scene, phaseStartServerTime})` - To specific player
- `stateUpdate(fullState)` - To all conductors
- `setPlayerPitch/setPlayerInterval/setScene` - Conductor controls
- `syncPing/syncPong` - Clock synchronization

## OSC Control

Send OSC to `127.0.0.1:9000` (UDP)

### Message Format
```
/conductor <target> <control> <value>
```

### Arguments
- `target` (int): Who to control
  - `0` = Global controls (scene)
  - `1, 2, 3...` = Specific player by PlayerID
  - `-1` = All connected players
- `control` (int): Which parameter
  - `1` = Pitch (MIDI note number 36-84)
  - `2` = Interval (milliseconds 50-3000)
  - `100` = Scene (global only, 0 = audioScore)
- `value` (float/int): New value

### Examples
```
/conductor 3 1 72      # Set PlayerID 3 pitch to 72 (C5)
/conductor 3 2 800     # Set PlayerID 3 interval to 800ms
/conductor -1 2 1200   # Set ALL players interval to 1200ms
/conductor 0 100 0     # Set scene to audioScore (index 0)
```

### Behavior
- OSC works even without a conductor browser tab open
- If conductor tabs are open, UI updates immediately
- Invalid player IDs are safely ignored
- Values are clamped to valid ranges
- Server logs: `OSC applied: target=..., control=..., value=...`

## How to Test

### Browser Testing
1. Open two browser tabs
2. Tab 1: Enter as Conductor
3. Tab 2: Enter as Player, enter name, join
4. Player will wait until conductor is present
5. Once conductor joins, player can start audio
6. Conductor can adjust pitch/interval sliders for each player
7. Changes reflect immediately on player's audio and visual score

### OSC Testing (Max/MSP example - LOCAL ONLY)
1. Create a `[udpsend 127.0.0.1 9000]` object
2. Send message: `/conductor 1 1 60` to set Player 1 pitch to C4
3. Send message: `/conductor 1 2 500` to set Player 1 interval to 500ms

**Note:** OSC only works when the server runs on the same machine as Max. For remote control, use Node for Max (below).

## Node for Max Control (Remote WebSocket)

For controlling the conductor from Max/MSP over the internet (when the app is hosted on Replit), use Node for Max with WebSocket:

### Setup
1. Download the script: `https://your-app-url.replit.app/public/conductor-control.js`
2. Place it in your Max project folder
3. Run `npm install socket.io-client` in that folder
4. In Max, create `[node.script conductor-control.js]`

### Usage in Max
```
Connect to server:
  [message: connect https://your-app-url.replit.app]
      |
  [node.script conductor-control.js]

Control a player (target, control, value):
  [1]  [1]  [60]     <- player 1, control 1 (pitch), value 60
   |    |     |
  [pak i i i]
      |
  [prepend control]
      |
  [node.script conductor-control.js]
```

### Control IDs (audioScore scene)
All commands use integers: `target control value`
- **1** = Pitch (MIDI note 36-84)
- **2** = Interval (milliseconds 50-3000)

### Shorthand handlers:
- `pitch <target> <value>` - Set player pitch (uses control ID 1)
- `interval <target> <value>` - Set player interval (uses control ID 2)
- `allpitch <value>` - Set all players pitch
- `allinterval <value>` - Set all players interval

### Control values:
- **target**: 1, 2, 3... = specific player, -1 = all players
- **control**: integer ID (1=pitch, 2=interval) or string ("pitch", "interval") for backwards compatibility
- **pitch value**: MIDI note 36-84
- **interval value**: milliseconds 50-3000

## Control Registry

Controls are defined in `shared/controls.ts` and are scene-aware. When adding new scenes with different controls, define them there. Control IDs correspond to slider positions in the conductor UI.

## Limitations
- Browser audio requires user gesture (player must click "Start Audio")
- In-memory state resets on server restart
- Scene 1 (Audio Score) only - future scenes planned
- Player IDs are session-stable only (reset on server restart)

## User Preferences
- Clean, minimal UI following Apple HIG design
- Responsive layout for all screen sizes
- Real-time feedback with smooth animations
