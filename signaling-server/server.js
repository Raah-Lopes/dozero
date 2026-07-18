const { WebSocketServer } = require("ws");
const setupWSConnection = require("y-webrtc/bin/utils").setupWSConnection;

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });

wss.on("connection", (ws, req) => {
  setupWSConnection(ws, req);
});

console.log("Signaling server running on port", process.env.PORT || 8080);
