import { BOARD_SIZE, type Cell, type Point, type Stone } from "../shared/types.js";
import { createBoard } from "../shared/rules.js";

/**
 * Canvas 五子棋棋盘:负责绘制与触摸/点击落子交互。
 * 只管展示与输入,不含胜负逻辑(由调用方结合 rules 判定)。
 */
export class BoardView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: Cell[][] = createBoard();
  private cellSize = 0;
  private padding = 0;
  private lastMove: Point | null = null;
  private onPlace?: (p: Point) => void;
  private pointerStart: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.resize();
  }

  /** 注册落子回调(用户点击空位时触发) */
  onPlaceStone(cb: (p: Point) => void): void {
    this.onPlace = cb;
  }

  /** 根据容器宽度自适应尺寸(移动端友好),使用 devicePixelRatio 保证清晰 */
  resize(): void {
    const size = Math.min(
      this.canvas.parentElement?.clientWidth ?? 360,
      window.innerHeight * 0.7
    );
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.scale(dpr, dpr);
    // 四周留半格,棋子落在交叉线上
    this.padding = size / (BOARD_SIZE + 1);
    this.cellSize = (size - this.padding * 2) / (BOARD_SIZE - 1);
    this.render();
  }

  /** 设置整盘棋子状态并重绘 */
  setBoard(board: Cell[][], lastMove: Point | null = null): void {
    this.board = board;
    this.lastMove = lastMove;
    this.render();
  }

  /** 落一子(本地更新)并重绘 */
  place(x: number, y: number, color: Stone): void {
    this.board[y][x] = color;
    this.lastMove = { x, y };
    this.render();
    // 轻微震动反馈(移动端支持时)
    navigator.vibrate?.(15);
  }

  /** 重置为空棋盘 */
  reset(): void {
    this.board = createBoard();
    this.lastMove = null;
    this.render();
  }

  // 按下记录起点;抬起时若位移过大视为滑动,不落子(防误触)
  private handlePointerDown = (e: PointerEvent): void => {
    this.pointerStart = { x: e.clientX, y: e.clientY };
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.onPlace || !this.pointerStart) return;
    const moved = Math.hypot(
      e.clientX - this.pointerStart.x,
      e.clientY - this.pointerStart.y
    );
    this.pointerStart = null;
    if (moved > 10) return; // 滑动,忽略

    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = Math.round((px - this.padding) / this.cellSize);
    const y = Math.round((py - this.padding) / this.cellSize);
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;
    this.onPlace({ x, y });
  };

  private render(): void {
    const ctx = this.ctx;
    const size = this.padding * 2 + this.cellSize * (BOARD_SIZE - 1);
    // 背景(木色)
    ctx.fillStyle = "#e8c07d";
    ctx.fillRect(0, 0, size, size);

    // 网格线
    ctx.strokeStyle = "#8a6d3b";
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = this.padding + i * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.padding, pos);
      ctx.lineTo(size - this.padding, pos);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos, this.padding);
      ctx.lineTo(pos, size - this.padding);
      ctx.stroke();
    }

    // 天元与星位
    const stars = [3, 7, 11];
    ctx.fillStyle = "#5a4520";
    for (const sy of stars) {
      for (const sx of stars) {
        ctx.beginPath();
        ctx.arc(
          this.padding + sx * this.cellSize,
          this.padding + sy * this.cellSize,
          3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    // 棋子
    const r = this.cellSize * 0.42;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const c = this.board[y][x];
        if (!c) continue;
        const cx = this.padding + x * this.cellSize;
        const cy = this.padding + y * this.cellSize;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = c === "black" ? "#1a1a1a" : "#f5f5f5";
        ctx.fill();
        ctx.strokeStyle = c === "black" ? "#000" : "#bbb";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 最后一手标记
    if (this.lastMove) {
      const cx = this.padding + this.lastMove.x * this.cellSize;
      const cy = this.padding + this.lastMove.y * this.cellSize;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "#e53935";
      ctx.fill();
    }
  }
}
