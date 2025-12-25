# Cricket Tools

<img src="client/public/favicon.png" alt="Cricket Tools" width="200" />

Cricket Tools is a real-time, multi-user web app for audio scoring on mobile devices.

A **Conductor** controls parameters for multiple **Players**. Players see a personalized visual score and hear synchronized audio.

## Table of contents
- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Getting started (local)](#getting-started-local)
- [Running in production](#running-in-production)
- [Docker](#docker)
- [Usage](#usage)
  - [Live Play (real-time synth score)](#live-play-real-time-synth-score)
  - [MP3 Sync (synchronized playback)](#mp3-sync-synchronized-playback)
- [External control](#external-control)
  - [OSC (UDP)](#osc-udp)
  - [Node for Max (Socket.IO)](#node-for-max-socketio)
- [Configuration](#configuration)
- [Project layout](#project-layout)
- [License](#license)

## Features
- Two tools:
  - **Live Play** (real-time synth scoring)
  - **MP3 Sync** (synchronized playback)
- Two roles per tool:
  - **Conductor**
  - **Player**
- Real-time updates via **Socket.IO**, including basic clock sync for aligned playback
- Audio synthesis and timing using **Tone.js**
- Optional external control via **OSC over UDP** and a **Node for Max** script

## How it works
- Players connect from phones/tablets/laptops and join as **Player**.
- A Conductor joins as **Conductor** and changes parameters in real time.
- The server maintains in-memory state and broadcasts updates to connected clients.

## Tech stack
- Frontend: React + Vite + Tailwind
- Backend: Express + Socket.IO
- Audio: Tone.js
- Optional: OSC control (UDP)

## Getting started (local)
### Prerequisites
You have two options:
- Option A (recommended): Install Node.js (Node 20+ recommended) and npm
- Option B (beginner-friendly): Use a fresh Conda environment that includes Node.js (works on macOS and Windows with Anaconda/Miniconda installed)

### Option A: Standard Node setup (recommended)
1. Install Node.js (Node 20+ recommended)
2. In the project folder, install dependencies:
    ```bash
    npm install
    ```
3. Start the dev server:
    ```bash
    npm run dev
    ```
4. Open:
    - `http://localhost:5001`
    - Or from another device on the same Wi‑Fi/LAN: `http://<your-ip>:5001`

### Option B: Beginner setup with Conda (macOS/Windows)
1. Open a terminal / prompt
    - macOS: open **Terminal**
    - Windows: open **Anaconda Prompt**

2. Create a new Conda environment (one time)
    ```bash
    conda create -y -n cricket nodejs -c conda-forge
    ```

3. Activate it
    ```bash
    conda activate cricket
    ```

4. Verify Node and npm are available
    ```bash
    node -v
    npm -v
    ```

5. Go to the project folder
    - macOS:
      ```bash
      cd /Users/pedrogonzalez/Desktop/Cricket-Tools
      ```
    - Windows (example):
      ```bat
      cd %USERPROFILE%\Desktop\Cricket-Tools
      ```
      Adjust the path if your folder is elsewhere.

6. Install dependencies (one time)
    ```bash
    npm install
    ```

7. Run the app (development mode)
    ```bash
    npm run dev
    ```

8. Open:
    - `http://localhost:5001`
    - Or from another device on the same Wi‑Fi/LAN: `http://<your-ip>:5001`

### Optional “quieter” run (production build locally)
If you prefer a production server instead of the dev server:
```bash
npm run build
```

Then start:
- macOS/Linux:
  ```bash
  PORT=5001 NODE_ENV=production npm start
  ```
- Windows (cmd.exe):
  ```bat
  set PORT=5001 && set NODE_ENV=production && npm start
  ```

### Running it again later
- Open Terminal / Anaconda Prompt
- If you used Conda:
  ```bash
  conda activate cricket
  ```
- `cd` into the project folder
- Start:
  ```bash
  npm run dev
  ```

### Using a different port
- macOS/Linux:
  ```bash
  PORT=5002 npm run dev
  ```
- Windows (cmd.exe):
  ```bat
  set PORT=5002 && npm run dev
  ```

## Running in production
```bash
npm run build
npm start
```

`npm start` runs the bundled output at `dist/index.cjs`.

## Docker
Build and run:
```bash
docker build -t cricket-tools .
docker run --rm -p 5001:5001 -e NODE_ENV=production cricket-tools
```

Persist uploaded files (MP3 Sync):
```bash
docker run --rm -p 5001:5001 -v "$(pwd)/uploads:/app/uploads" -e NODE_ENV=production cricket-tools
```

## Usage
### Live Play (real-time synth score)
1. Open the app and join as **Conductor** on one device.
2. Join as **Player** on one or more other devices.
3. Use the Conductor UI to change parameters (e.g. pitch/interval). Players update immediately.

### MP3 Sync (synchronized playback)
MP3 Sync is slot-based (default `MAX_SLOTS = 8`). Each connected MP3 player gets assigned the lowest available slot.

Typical flow:
1. Join as **MP3 Conductor**.
2. Join as **MP3 Player** on each device (each device receives a slot).
3. Upload MP3s to slots from the Conductor UI.
4. Start playback from the Conductor UI. Players receive a scheduled start time and a seek offset for alignment.

Server-side endpoints used by the UI:
- `POST /api/upload/slot/:slotIndex` (multipart field name: `file`, MP3 only, max 80MB)
- `GET /api/files/:fileId` (streams the MP3)
- `DELETE /api/slot/:slotIndex/file` (removes slot’s MP3 from disk + state)

## External control
### OSC (UDP)
The server listens for OSC over UDP at `127.0.0.1:9000`.

Message format:
```text
/conductor <target> <control> <value>
```

- `target` (int):
  - `1..N`: specific player number (stable numeric ID assigned by the server)
  - `-1`: all players
  - `0`: global (reserved for scene selection)
- `control` (int, for the `audioScore` scene):
  - `1`: pitch (36–84 MIDI)
  - `2`: interval (50–3000 ms)
  - `100`: scene (global only; uses a numeric index)
- `value` (number)

Examples:
```text
/conductor 3 1 72
/conductor -1 2 1200
/conductor 0 100 0
```

### Node for Max (Socket.IO)
Use `public/conductor-control.js` to control the Conductor from Max via Node for Max.

1. Copy `public/conductor-control.js` into your Max project folder
2. In that folder run: `npm install socket.io-client`
3. In Max create: `[node.script conductor-control.js]`

## Configuration
- HTTP server port:
  - Default: `5001`
  - Override with `PORT`
- HTTP server host:
  - Default: `0.0.0.0`
  - Override with `HOST`
- OSC:
  - Fixed at `127.0.0.1:9000`
- Uploads directory:
  - `./uploads`

## Project layout
- `client/` React UI (Vite)
- `server/` Express + Socket.IO server
- `shared/` shared types and control registry
- `public/` static helper assets (served at `/public`)
- `uploads/` runtime MP3 uploads (MP3 Sync)
- `script/build.ts` builds client + bundles server into `dist/`

## License
MIT
