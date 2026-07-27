import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../shared/types.js";
import { registerRoomHandlers } from "./socket/room.js";
import { registerAIHandlers } from "./socket/aiGame.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true },
});

// 生产环境托管前端构建产物(dist/client)
const clientDir = resolve(__dirname, "../client");
if (existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get("*", (_req, res) => {
    res.sendFile(resolve(clientDir, "index.html"));
  });
}

io.on("connection", (socket) => {
  console.log("[socket] connected:", socket.id);
  registerRoomHandlers(io, socket);
  registerAIHandlers(io, socket);
  socket.on("disconnect", () => {
    console.log("[socket] disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
