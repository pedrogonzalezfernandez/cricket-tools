/**
 * Node for Max script to control the Conductor via WebSocket
 * 
 * SETUP:
 * 1. Copy this file to your Max project folder
 * 2. Run: npm install socket.io-client (in your Max project folder)
 * 3. In Max, create a [node.script conductor-control.js] object
 * 
 * CONTROL FORMAT:
 * All commands use integers only: target, control, value
 * 
 * Target values:
 *   1, 2, 3...: specific player number
 *   -1: all players
 * 
 * Control IDs (for audioScore scene):
 *   1 = pitch (MIDI note 36-84)
 *   2 = interval (milliseconds 50-3000)
 * 
 * USAGE IN MAX:
 * 
 * Connect to server:
 *   [message: connect https://your-app-url.replit.app]
 *       |
 *   [node.script conductor-control.js]
 * 
 * Integer-only control (target, control, value):
 *   [1]  [1]  [60]     <- player 1, control 1 (pitch), value 60
 *    |    |     |
 *   [pak i i i]
 *       |
 *   [prepend control]
 *       |
 *   [node.script conductor-control.js]
 * 
 * Alternative with string control names (backwards compatible):
 *   [1]  [pitch]  [60]
 *    |      |       |
 *   [pak i s i]
 *       |
 *   [prepend control]
 *       |
 *   [node.script conductor-control.js]
 */

const Max = require("max-api");

let io;
let socket = null;
let isConnected = false;

Max.post("Conductor Control script loaded");
Max.post("Control IDs: 1=pitch, 2=interval");
Max.post("Use 'connect <url>' to connect to the conductor server");

Max.addHandler("connect", async (url) => {
  if (!url) {
    Max.post("Error: Please provide a URL");
    return;
  }

  try {
    if (!io) {
      io = require("socket.io-client");
    }

    if (socket) {
      socket.disconnect();
    }

    Max.post("Connecting to: " + url);
    
    socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on("connect", () => {
      isConnected = true;
      Max.post("Connected to conductor server!");
      Max.outlet("connected", 1);
      
      socket.emit("joinConductor");
      Max.post("Joined as conductor - ready to send commands");
    });

    socket.on("disconnect", () => {
      isConnected = false;
      Max.post("Disconnected from server");
      Max.outlet("connected", 0);
    });

    socket.on("connect_error", (err) => {
      Max.post("Connection error: " + err.message);
      Max.outlet("connected", 0);
    });

    socket.on("stateUpdate", (state) => {
      const playerCount = Object.keys(state.players).length;
      Max.outlet("players", playerCount);
    });

    socket.on("fullState", (state) => {
      const playerCount = Object.keys(state.players).length;
      Max.post("Received state: " + playerCount + " players connected");
      Max.outlet("players", playerCount);
    });

  } catch (err) {
    Max.post("Error: " + err.message);
  }
});

Max.addHandler("disconnect", () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
    Max.post("Disconnected");
    Max.outlet("connected", 0);
  }
});

Max.addHandler("control", (target, control, value) => {
  if (!isConnected || !socket) {
    Max.post("Error: Not connected. Use 'connect <url>' first");
    return;
  }

  if (typeof target !== "number" || typeof value !== "number") {
    Max.post("Error: target and value must be numbers");
    return;
  }

  socket.emit("maxCommand", { target, control, value });
});

Max.addHandler("pitch", (target, value) => {
  if (!isConnected || !socket) {
    Max.post("Error: Not connected");
    return;
  }
  socket.emit("maxCommand", { target, control: 1, value });
});

Max.addHandler("interval", (target, value) => {
  if (!isConnected || !socket) {
    Max.post("Error: Not connected");
    return;
  }
  socket.emit("maxCommand", { target, control: 2, value });
});

Max.addHandler("allpitch", (value) => {
  if (!isConnected || !socket) {
    Max.post("Error: Not connected");
    return;
  }
  socket.emit("maxCommand", { target: -1, control: 1, value });
});

Max.addHandler("allinterval", (value) => {
  if (!isConnected || !socket) {
    Max.post("Error: Not connected");
    return;
  }
  socket.emit("maxCommand", { target: -1, control: 2, value });
});
