import type { Difficulty } from "../../shared/types.js";

type HomeHandlers = {
  onRoom: () => void;
  onAI: (difficulty: Difficulty) => void;
};

/** 首页:模式选择 */
export function renderHome(root: HTMLElement, handlers: HomeHandlers): void {
  root.innerHTML = `
    <div class="screen home">
      <h1 class="title">五子棋</h1>
      <button class="btn btn-primary" id="mode-room">房间对战</button>
      <div class="ai-block">
        <div class="ai-label">人机对决</div>
        <div class="difficulty">
          <button class="btn btn-ghost" data-diff="easy">简单</button>
          <button class="btn btn-ghost" data-diff="medium">中等</button>
          <button class="btn btn-ghost" data-diff="hard">困难</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector<HTMLButtonElement>("#mode-room")!.addEventListener(
    "click",
    handlers.onRoom
  );
  root.querySelectorAll<HTMLButtonElement>("[data-diff]").forEach((btn) => {
    btn.addEventListener("click", () => {
      handlers.onAI(btn.dataset.diff as Difficulty);
    });
  });
}
