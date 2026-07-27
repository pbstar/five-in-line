import type { Server, Socket } from "socket.io";
import {
  type Cell,
  type Difficulty,
  type Stone,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "../../shared/types.js";
import { canPlace, checkWin, createBoard, isBoardFull } from "../../shared/rules.js";
import { builtinMove } from "../ai/builtin.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface AIGame {
  board: Cell[][];
  difficulty: Difficulty;
  over: boolean;
  aiPending: boolean; // AI 正在决策,忽略此期间玩家落子
}

// 玩家执黑先手,AI 执白
const PLAYER: Stone = "black";
const AI: Stone = "white";

/** 每个连接维护一局人机对局(单人,无需房间) */
const games = new Map<string, AIGame>();

export function registerAIHandlers(_io: IOServer, socket: GameSocket): void {
  socket.on("ai:new", ({ difficulty }) => {
    games.set(socket.id, {
      board: createBoard(),
      difficulty,
      over: false,
      aiPending: false,
    });
  });

  socket.on("ai:move", async ({ x, y }) => {
    const game = games.get(socket.id);
    if (!game || game.over || game.aiPending) return;
    if (!canPlace(game.board, x, y)) return;

    // 玩家落子
    game.board[y][x] = PLAYER;
    socket.emit("ai:move", { x, y, color: PLAYER });
    if (checkWin(game.board, x, y, PLAYER)) {
      game.over = true;
      socket.emit("ai:over", { winner: PLAYER });
      return;
    }
    if (isBoardFull(game.board)) {
      game.over = true;
      socket.emit("ai:over", { winner: null });
      return;
    }

    // AI 决策
    game.aiPending = true;
    socket.emit("ai:thinking");

    const move = await builtinAIMove(game.board, AI, game.difficulty);

    // 决策期间对局可能已被重置/断开
    const current = games.get(socket.id);
    if (!current || current !== game || game.over) return;

    game.board[move.y][move.x] = AI;
    socket.emit("ai:move", { x: move.x, y: move.y, color: AI });
    if (checkWin(game.board, move.x, move.y, AI)) {
      game.over = true;
      socket.emit("ai:over", { winner: AI });
    } else if (isBoardFull(game.board)) {
      game.over = true;
      socket.emit("ai:over", { winner: null });
    }

    game.aiPending = false;
  });

  socket.on("disconnect", () => {
    games.delete(socket.id);
  });
}

/** 内置 AI + 短暂延迟模拟思考 */
async function builtinAIMove(board: Cell[][], aiColor: Stone, difficulty: Difficulty) {
  // 延迟 200~400ms，让 "AI 思考中…" 可见
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 200));
  return builtinMove(board, aiColor, difficulty);
}
