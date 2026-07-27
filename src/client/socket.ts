import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../shared/types.js";

export type GameClientSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

let socket: GameClientSocket | null = null;

/** 获取(惰性创建)全局 socket 连接 */
export function getSocket(): GameClientSocket {
  if (!socket) {
    // 同源连接;dev 模式由 Vite 代理到后端
    socket = io({ autoConnect: true });
  }
  return socket;
}
