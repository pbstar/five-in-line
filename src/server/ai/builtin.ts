import {
  BOARD_SIZE,
  WIN_COUNT,
  type Cell,
  type Difficulty,
  type Point,
  type Stone,
} from "../../shared/types.js";
import { canPlace, inBounds } from "../../shared/rules.js";

/** 四个扫描方向：水平、垂直、两条对角线 */
const DIRECTIONS: readonly [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

/** 不同难度的随机噪声范围 */
const NOISE_RANGE: Record<Difficulty, number> = {
  easy: 40,
  medium: 5,
  hard: 0,
};

/**
 * 内置 AI：评分法选最优落子。
 * easy：较大随机扰动，等分时随机选 → 经常走次优
 * medium：微量扰动，等分取第一个 → 基本最优但偶有偏差
 */
export function builtinMove(board: Cell[][], aiColor: Stone, difficulty: Difficulty): Point {
  const opponent: Stone = aiColor === "black" ? "white" : "black";
  const noise = NOISE_RANGE[difficulty];

  let bestScore = -Infinity;
  let bestMoves: Point[] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!canPlace(board, x, y)) continue;
      // 只考虑已有棋子附近的空位，避免远离开局区域
      if (!hasNeighbor(board, x, y, 2)) continue;

      const attack = scoreCell(board, x, y, aiColor);
      const defense = scoreCell(board, x, y, opponent);
      // 攻防加权：防守略重 + 随机噪声
      const score = attack + defense * 1.1 + Math.random() * noise;

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [{ x, y }];
      } else if (score === bestScore) {
        bestMoves.push({ x, y });
      }
    }
  }

  // 无可选邻居（例如空棋盘第一步），落天元
  if (bestMoves.length === 0) {
    const center = Math.floor(BOARD_SIZE / 2);
    if (canPlace(board, center, center)) return { x: center, y: center };
    // 兜底：找任意空位
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (canPlace(board, x, y)) return { x, y };
      }
    }
    // 理论上不会到这里
    return { x: 0, y: 0 };
  }

  // easy：等分随机选；medium：取第一个（更稳定）
  if (difficulty === "easy") {
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
  return bestMoves[0];
}

/** 检查 (x, y) 的 distance 范围内是否有棋子 */
function hasNeighbor(board: Cell[][], x: number, y: number, distance: number): boolean {
  for (let dy = -distance; dy <= distance; dy++) {
    for (let dx = -distance; dx <= distance; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(nx, ny) && board[ny][nx] !== null) return true;
    }
  }
  return false;
}

/**
 * 评估将 color 棋子放在 (x, y) 后的得分。
 * 扫描四个方向，按连子数和开口数打分。
 */
function scoreCell(board: Cell[][], x: number, y: number, color: Stone): number {
  let score = 0;
  for (const [dx, dy] of DIRECTIONS) {
    score += scoreDirection(board, x, y, dx, dy, color);
  }
  return score;
}

/**
 * 沿一个方向评估：已落在 (x,y) 的 color 棋子和该方向上已有的同色棋子
 * 形成的连子数及两端开口情况。
 */
function scoreDirection(
  board: Cell[][],
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: Stone,
): number {
  // 正方向计数
  let posCount = 0;
  for (let i = 1; i < WIN_COUNT; i++) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (inBounds(nx, ny) && board[ny][nx] === color) posCount++;
    else break;
  }
  // 负方向计数
  let negCount = 0;
  for (let i = 1; i < WIN_COUNT; i++) {
    const nx = x - dx * i;
    const ny = y - dy * i;
    if (inBounds(nx, ny) && board[ny][nx] === color) negCount++;
    else break;
  }

  const count = posCount + negCount; // 不含当前落子

  // 两端开口情况
  const posOpen =
    inBounds(x + dx * (posCount + 1), y + dy * (posCount + 1)) &&
    board[y + dy * (posCount + 1)][x + dx * (posCount + 1)] === null;
  const negOpen =
    inBounds(x - dx * (negCount + 1), y - dy * (negCount + 1)) &&
    board[y - dy * (negCount + 1)][x - dx * (negCount + 1)] === null;
  const opens = (posOpen ? 1 : 0) + (negOpen ? 1 : 0);

  return patternScore(count, opens);
}

/** 根据连子数 + 开口数返回分数 */
function patternScore(count: number, opens: number): number {
  // 两端封死且不足 5 子 → 废线
  if (opens === 0 && count < WIN_COUNT - 1) return 0;

  // 五连 / 活四：必胜
  if (count >= WIN_COUNT - 1) return 100_000; // 落子即胜
  if (count === 3) {
    return opens === 2 ? 10_000 : 2_000; // 活四 / 冲四
  }
  if (count === 2) {
    return opens === 2 ? 2_000 : 400; // 活三 / 眠三
  }
  if (count === 1) {
    return opens === 2 ? 400 : 80; // 活二 / 眠二
  }
  if (count === 0) {
    return opens === 2 ? 20 : 5; // 活一 / 孤子
  }
  return 1;
}
