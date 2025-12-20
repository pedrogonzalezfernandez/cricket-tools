/**
 * Node for Max script to control the Conductor via WebSocket
 * 
 * SETUP:
 * 1. Copy this file to your Max project folder
 * 2. Run: npm install socket.io-client (in your Max project folder)
 * 3. In Max, create a [node.script conductor-control.js] object
 * 
 * USAGE IN MAX:
 * 
 * Connect to server:
 *   [message: connect https://your-app-url.replit.app]
 *       |
 *   [node.script conductor-control.js]
 * 
 * Send control command (target, control, value):
 *   [1]  [pitch]  [60]     <- player 1, pitch, MIDI note 60
 *    |      |       |
 *   [pak i s i]
 *       |
 *   [prepend control]
 *       |
 *   [node.script conductor-control.js]
 * 
 * Control types:
 *   - "pitch": MIDI note (36-84)
 *   - "interval": milliseconds (50-3000)
 * 
 * Target values:
 *   - 1, 2, 3...: specific player number
 *   - -1: all players
 */

const Max = require("max-api");

let io;
let socket = null;
let isConnected = false;

Max.post("Conductor Control script loaded");
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

  if (control !== "pitch" && control !== "interval") {
    Max.post("Error: control must be 'pitch' or 'interval'");
    return;
  }

  socket.emit("maxCommand", { target, control, value });
});

Max.addHandler("pitch", (target, value) => {
  if (!isConnected || !socket) {
    Max.post("Error: Not connected");
    return;
  }
  socket.emit("maxCommand", { target, control: "pitch", value });
});

Max.addHandler("interval", (target, value) => {
  if (!isConnected || !socket) {
    Max.post("Error: Not connected");
    return;
  }
  socket.emit("maxCommand", { target, control: "interval", value });
});

Max.addHandler("allpitch", (value) => {
  if (!isConnected || !socket) {
    Max.post("Error: Not connected");
    return;
  }
  socket.emit("maxCommand", { target: -1, control: "pitch", value });
});

Max.addHandler("allinterval", (value) => {
  if (!isConnected || !socket) {
    Max.post("Error: Not connected");
    return;
  }
  socket.emit("maxCommand", { target: -1, control: "interval", value });
});
