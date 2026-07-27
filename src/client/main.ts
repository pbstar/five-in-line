import { renderHome } from "./views/home.js";
import { renderRoom } from "./views/room.js";
import { renderAI } from "./views/ai.js";

const app = document.querySelector<HTMLDivElement>("#app")!;

function goHome(): void {
  renderHome(app, {
    onRoom: () => renderRoom(app, goHome),
    onAI: (difficulty) => renderAI(app, difficulty, goHome),
  });
}

goHome();
