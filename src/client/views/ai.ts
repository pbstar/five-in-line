import { BoardView } from "../board.js";
import { createBoard } from "../../shared/rules.js";
import { getSocket } from "../socket.js";
import type { Cell, Difficulty, Stone } from "../../shared/types.js";

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

/** 人机对决视图：玩家执黑先手，AI 执白 */
export function renderAI(
  root: HTMLElement,
  difficulty: Difficulty,
  onBack: () => void
): void {
  const socket = getSocket();
  const player: Stone = "black";

  root.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <button class="link" id="back">← 返回</button>
        <div class="room-info">人机对决 · ${DIFF_LABEL[difficulty]}</div>
      </div>
      <div class="status" id="status">你执黑先手</div>
      <div class="board-wrap"><canvas id="board"></canvas></div>
      <button class="btn btn-ghost" id="restart">重新开始</button>
    </div>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>("#board")!;
  const statusEl = root.querySelector<HTMLDivElement>("#status")!;
  const view = new BoardView(canvas);

  // 仅用于本地重绘展示;胜负由服务端权威判定
  let board: Cell[][] = createBoard();
  let over = false;
  let busy = false; // AI 思考中,锁住玩家输入

  function newGame(): void {
    board = createBoard();
    view.reset();
    over = false;
    busy = false;
    statusEl.textContent = "你执黑先手";
    socket.emit("ai:new", { difficulty });
  }

  view.onPlaceStone(({ x, y }) => {
    if (over || busy || board[y][x] !== null) return;
    socket.emit("ai:move", { x, y });
  });

  // ---- Socket 事件 ----
  socket.on("ai:move", ({ x, y, color }) => {
    board[y][x] = color;
    view.place(x, y, color);
    // 玩家落子后进入 AI 回合(ai:thinking 会更新提示);AI 落子后轮到玩家
    if (color !== player && !over) {
      busy = false;
      statusEl.textContent = "轮到你了";
    }
  });

  socket.on("ai:thinking", () => {
    busy = true;
    statusEl.textContent = "AI 思考中…";
  });

  socket.on("ai:over", ({ winner }) => {
    over = true;
    busy = false;
    statusEl.textContent =
      winner === null ? "平局" : winner === player ? "你获胜!" : "AI 获胜!";
  });

  socket.on("ai:error", ({ message }) => {
    over = true;
    busy = false;
    statusEl.textContent = `对局终止:${message}`;
  });

  function cleanup(): void {
    socket.off("ai:move");
    socket.off("ai:thinking");
    socket.off("ai:over");
    socket.off("ai:error");
  }

  root.querySelector<HTMLButtonElement>("#restart")!.addEventListener("click", newGame);
  root.querySelector<HTMLButtonElement>("#back")!.addEventListener("click", () => {
    cleanup();
    onBack();
  });

  newGame();
}
