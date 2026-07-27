import type { Server, Socket } from "socket.io";
import {
  type Cell,
  type Point,
  type Stone,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "../../shared/types.js";
import { canPlace, checkWin, createBoard, isBoardFull } from "../../shared/rules.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface Player {
  socketId: string;
  color: Stone;
}

interface Room {
  id: string;
  board: Cell[][];
  players: Player[];
  turn: Stone;
  lastMove: Point | null;
  started: boolean;
  over: boolean;
}

const rooms = new Map<string, Room>();
// socketId -> roomId,便于断线时快速定位
const socketRoom = new Map<string, string>();

/** 生成一个未被占用的 4 位房间号(1000–9999) */
function generateRoomId(): string {
  // 房间数远小于 9000,循环碰撞概率极低
  for (let i = 0; i < 100; i++) {
    const id = String(Math.floor(1000 + Math.random() * 9000));
    if (!rooms.has(id)) return id;
  }
  throw new Error("房间号分配失败,请稍后重试");
}

export function registerRoomHandlers(io: IOServer, socket: GameSocket): void {
  socket.on("room:create", () => {
    let id: string;
    try {
      id = generateRoomId();
    } catch {
      socket.emit("room:error", { message: "房间已满,请稍后再试" });
      return;
    }
    const room: Room = {
      id,
      board: createBoard(),
      players: [{ socketId: socket.id, color: "black" }],
      turn: "black",
      lastMove: null,
      started: false,
      over: false,
    };
    rooms.set(id, room);
    socketRoom.set(socket.id, id);
    void socket.join(id);
    socket.emit("room:created", { roomId: id });
    socket.emit("room:joined", { roomId: id, color: "black" });
  });

  socket.on("room:join", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("room:error", { message: "房间不存在" });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit("room:error", { message: "房间已满" });
      return;
    }
    const color: Stone = "white";
    room.players.push({ socketId: socket.id, color });
    socketRoom.set(socket.id, roomId);
    void socket.join(roomId);
    socket.emit("room:joined", { roomId, color });

    // 双方就绪,开局(黑方先手)
    room.started = true;
    io.to(roomId).emit("game:start", { turn: room.turn });
  });

  socket.on("game:move", ({ roomId, x, y }) => {
    const room = rooms.get(roomId);
    if (!room || !room.started || room.over) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    // 权威裁判:校验轮次与落子合法性
    if (player.color !== room.turn) return;
    if (!canPlace(room.board, x, y)) return;

    room.board[y][x] = player.color;
    room.lastMove = { x, y };
    const nextTurn: Stone = player.color === "black" ? "white" : "black";

    if (checkWin(room.board, x, y, player.color)) {
      room.over = true;
      io.to(roomId).emit("game:move", { x, y, color: player.color, turn: nextTurn });
      io.to(roomId).emit("game:over", { winner: player.color, reason: "win" });
      cleanupRoom(roomId);
      return;
    }
    if (isBoardFull(room.board)) {
      room.over = true;
      io.to(roomId).emit("game:move", { x, y, color: player.color, turn: nextTurn });
      io.to(roomId).emit("game:over", { winner: null, reason: "win" });
      cleanupRoom(roomId);
      return;
    }

    room.turn = nextTurn;
    io.to(roomId).emit("game:move", { x, y, color: player.color, turn: nextTurn });
  });

  socket.on("disconnect", () => {
    const roomId = socketRoom.get(socket.id);
    socketRoom.delete(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const leaver = room.players.find((p) => p.socketId === socket.id);
    // 对局进行中掉线:判对方获胜
    if (room.started && !room.over && leaver) {
      const winner: Stone = leaver.color === "black" ? "white" : "black";
      room.over = true;
      socket.to(roomId).emit("game:over", { winner, reason: "disconnect" });
    }
    cleanupRoom(roomId);
  });
}

/** 移除房间及其成员映射 */
function cleanupRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    for (const p of room.players) socketRoom.delete(p.socketId);
  }
  rooms.delete(roomId);
}
