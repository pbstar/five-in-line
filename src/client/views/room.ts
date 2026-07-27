import { BoardView } from "../board.js";
import { getSocket } from "../socket.js";
import type { Stone } from "../../shared/types.js";

/** 房间对战视图:大厅(创建/加入)+ 联机对局 */
export function renderRoom(root: HTMLElement, onBack: () => void): void {
  const socket = getSocket();
  let myColor: Stone | null = null;
  let myTurn = false;
  let roomId = "";

  root.innerHTML = `
    <div class="screen room">
      <div class="topbar">
        <button class="link" id="back">← 返回</button>
        <div class="room-info" id="room-info"></div>
      </div>
      <div class="lobby" id="lobby">
        <button class="btn btn-primary" id="create">创建房间</button>
        <div class="join-block">
          <input class="input" id="join-input" inputmode="numeric" maxlength="4" placeholder="输入4位房间号" />
          <button class="btn btn-ghost" id="join">加入</button>
        </div>
        <div class="hint" id="lobby-hint"></div>
      </div>
      <div class="play" id="play" style="display:none">
        <div class="status" id="status">等待对手加入…</div>
        <div class="board-wrap"><canvas id="board"></canvas></div>
      </div>
    </div>
  `;

  const lobby = root.querySelector<HTMLDivElement>("#lobby")!;
  const play = root.querySelector<HTMLDivElement>("#play")!;
  const statusEl = root.querySelector<HTMLDivElement>("#status")!;
  const roomInfo = root.querySelector<HTMLDivElement>("#room-info")!;
  const hint = root.querySelector<HTMLDivElement>("#lobby-hint")!;
  const joinInput = root.querySelector<HTMLInputElement>("#join-input")!;

  let view: BoardView | null = null;

  function label(c: Stone): string {
    return c === "black" ? "黑方" : "白方";
  }

  function updateStatus(): void {
    if (myTurn) statusEl.textContent = "轮到你了";
    else statusEl.textContent = "等待对方落子…";
  }

  function enterGame(): void {
    lobby.style.display = "none";
    play.style.display = "flex";
    const canvas = root.querySelector<HTMLCanvasElement>("#board")!;
    view = new BoardView(canvas);
    view.onPlaceStone(({ x, y }) => {
      if (!myTurn || !myColor) return;
      socket.emit("game:move", { roomId, x, y });
    });
  }

  root.querySelector<HTMLButtonElement>("#back")!.addEventListener("click", () => {
    cleanup();
    onBack();
  });

  root.querySelector<HTMLButtonElement>("#create")!.addEventListener("click", () => {
    socket.emit("room:create");
  });

  root.querySelector<HTMLButtonElement>("#join")!.addEventListener("click", () => {
    const id = joinInput.value.trim();
    if (!/^\d{4}$/.test(id)) {
      hint.textContent = "请输入4位数字房间号";
      return;
    }
    socket.emit("room:join", { roomId: id });
  });

  // 仅允许输入数字
  joinInput.addEventListener("input", () => {
    joinInput.value = joinInput.value.replace(/\D/g, "").slice(0, 4);
  });

  // ---- Socket 事件 ----
  socket.on("room:created", ({ roomId: id }) => {
    roomId = id;
    roomInfo.textContent = `房间号 ${id}`;
    enterGame();
    statusEl.innerHTML = `房间号 <b class="room-code" id="room-code">${id}</b> · 点击复制,等待对手加入…`;
    root.querySelector<HTMLElement>("#room-code")?.addEventListener("click", () => {
      void navigator.clipboard?.writeText(id).then(() => {
        const el = root.querySelector<HTMLElement>("#room-code");
        if (el) {
          const prev = el.textContent;
          el.textContent = "已复制";
          setTimeout(() => (el.textContent = prev), 1000);
        }
      });
    });
  });

  socket.on("room:joined", ({ roomId: id, color }) => {
    roomId = id;
    myColor = color;
    roomInfo.textContent = `房间号 ${id} · 你执${label(color)}`;
    if (play.style.display === "none") enterGame();
  });

  socket.on("game:start", ({ turn }) => {
    myTurn = myColor === turn;
    updateStatus();
  });

  socket.on("game:move", ({ x, y, color, turn }) => {
    view?.place(x, y, color);
    myTurn = myColor === turn;
    updateStatus();
  });

  socket.on("game:over", ({ winner, reason }) => {
    myTurn = false;
    if (reason === "disconnect") {
      statusEl.textContent =
        winner === myColor ? "对方掉线,你获胜!" : "你已掉线";
    } else if (winner === null) {
      statusEl.textContent = "平局";
    } else {
      statusEl.textContent = winner === myColor ? "你获胜!" : "你输了";
    }
  });

  socket.on("room:error", ({ message }) => {
    hint.textContent = message;
  });

  function cleanup(): void {
    socket.off("room:created");
    socket.off("room:joined");
    socket.off("game:start");
    socket.off("game:move");
    socket.off("game:over");
    socket.off("room:error");
  }
}
