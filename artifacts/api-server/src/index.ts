import http from "http";
import { Server as SocketServer } from "socket.io";
import app from "./app";
import { slackService } from "./slack/service";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = http.createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/api/socket.io",
});

slackService.setSocketServer(io);

io.on("connection", (socket) => {
  console.log("Socket client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Socket client disconnected:", socket.id);
  });
});

httpServer.listen(port, async () => {
  console.log(`Server listening on port ${port}`);

  try {
    const restored = await slackService.loginWithSession();
    if (restored) {
      console.log("Slack session restored from saved state");
    } else {
      console.log("No saved Slack session found");
    }
  } catch (err) {
    console.error("Failed to restore Slack session:", err);
  }
});
