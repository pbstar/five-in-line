import { BOARD_SIZE, WIN_COUNT, type Cell, type Stone } from "./types.js";

/** 创建空棋盘(二维数组,board[y][x]) */
export function createBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<Cell>(BOARD_SIZE).fill(null)
  );
}

/** 坐标是否在棋盘内 */
export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

/** 该点是否可落子(在界内且为空) */
export function canPlace(board: Cell[][], x: number, y: number): boolean {
  return inBounds(x, y) && board[y][x] === null;
}

// 四个方向:水平、垂直、两条对角线
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

/**
 * 判断在 (x, y) 落下 color 后是否连成五子。
 * 只需检查以该落子点为中心、四个方向上的连子数。
 */
export function checkWin(
  board: Cell[][],
  x: number,
  y: number,
  color: Stone
): boolean {
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1;
    // 正方向延伸
    for (let step = 1; step < WIN_COUNT; step++) {
      const nx = x + dx * step;
      const ny = y + dy * step;
      if (inBounds(nx, ny) && board[ny][nx] === color) count++;
      else break;
    }
    // 反方向延伸
    for (let step = 1; step < WIN_COUNT; step++) {
      const nx = x - dx * step;
      const ny = y - dy * step;
      if (inBounds(nx, ny) && board[ny][nx] === color) count++;
      else break;
    }
    if (count >= WIN_COUNT) return true;
  }
  return false;
}

/** 棋盘是否已下满(平局判定) */
export function isBoardFull(board: Cell[][]): boolean {
  return board.every((row) => row.every((cell) => cell !== null));
}
