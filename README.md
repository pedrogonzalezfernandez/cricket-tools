# Cricket Tools

<img src="client/public/favicon.png" alt="Cricket Tools" width="96" />

Cricket Tools is a real-time, multi-user conductor/player web app for mobile-friendly audio scoring: a Conductor controls parameters for multiple Players, who see a personalized visual score and hear synchronized audio.

## Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start (Local)](#quick-start-local)
- [Docker](#docker)
- [OSC Control](#osc-control)
- [Node for Max (Remote WebSocket)](#node-for-max-remote-websocket)
- [Project Layout](#project-layout)
- [License](#license)

## Features
- Two tools: **Live Play** (real-time synth scoring) and **MP3 Sync** (synchronized playback).
- Two roles per tool: **Conductor** and **Player**.
- Real-time updates via **Socket.IO** with clock sync for aligned playback.
- Audio synthesis and timing using **Tone.js**.
- OSC UDP input for external control (Max/MSP, etc.).

## Tech Stack
- Frontend: React + Vite + Tailwind
- Backend: Express + Socket.IO
- Audio: Tone.js
- Optional: OSC control (UDP)

## Quick Start (Local)
Prereqs: Node.js + npm (or use your existing Conda `cricket` env from `README.txt`).

```
npm install
npm run dev
```

Open `http://localhost:5001` (or from another device on the same network: `http://<your-ip>:5001`).

### Production build
```
npm run build
npm start
```

## Docker
Build and run:
```
docker build -t cricket-tools .
docker run --rm -p 5001:5001 -e NODE_ENV=production cricket-tools
```

If you want uploads persisted on your machine:
```
docker run --rm -p 5001:5001 -v "$(pwd)/uploads:/app/uploads" -e NODE_ENV=production cricket-tools
```

## OSC Control
Send OSC UDP to `127.0.0.1:9000`:

```
/conductor <target> <control> <value>
```

- `target` (int): `0` global, `1..N` player id, `-1` all players
- `control` (int): `1` pitch (36–84), `2` interval (50–3000ms), `100` scene (global)

Examples:
```
/conductor 3 1 72
/conductor -1 2 1200
/conductor 0 100 0
```

## Node for Max (Remote WebSocket)
Use `public/conductor-control.js` to control the Conductor over WebSocket from Max:

1. Copy `public/conductor-control.js` into your Max project folder
2. In that folder: `npm install socket.io-client`
3. In Max: create `[node.script conductor-control.js]`

## Project Layout
- `client/` React UI (Vite)
- `server/` Express + Socket.IO server
- `shared/` shared types/schema/controls
- `public/` static helper assets (served at `/public`)
- `script/build.ts` builds client + bundles server into `dist/`

## License
MIT
