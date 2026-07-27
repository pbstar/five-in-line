// 前后端共享的类型定义

/** 棋子颜色:黑先手,白后手 */
export type Stone = "black" | "white";

/** 棋盘尺寸(15×15 标准五子棋) */
export const BOARD_SIZE = 15;

/** 连成获胜所需子数 */
export const WIN_COUNT = 5;

/** 棋盘格子状态:null 表示空 */
export type Cell = Stone | null;

/** 落子坐标 */
export interface Point {
  x: number;
  y: number;
}

/** 对局结束原因 */
export type GameOverReason = "win" | "disconnect";

/** 人机难度 */
export type Difficulty = "easy" | "medium" | "hard";

// ---- Socket.IO 事件负载 ----

export interface ServerToClientEvents {
  "room:created": (data: { roomId: string }) => void;
  "room:joined": (data: { roomId: string; color: Stone }) => void;
  "game:start": (data: { turn: Stone }) => void;
  "game:move": (data: { x: number; y: number; color: Stone; turn: Stone }) => void;
  "game:over": (data: { winner: Stone | null; reason: GameOverReason }) => void;
  "room:error": (data: { message: string }) => void;
  // 人机对决
  "ai:move": (data: { x: number; y: number; color: Stone }) => void;
  "ai:thinking": () => void;
  "ai:over": (data: { winner: Stone | null }) => void;
  "ai:error": (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  "room:create": () => void;
  "room:join": (data: { roomId: string }) => void;
  "game:move": (data: { roomId: string; x: number; y: number }) => void;
  // 人机对决:开新局 / 玩家落子
  "ai:new": (data: { difficulty: Difficulty }) => void;
  "ai:move": (data: { x: number; y: number }) => void;
}
