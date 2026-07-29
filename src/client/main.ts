import { renderHome } from "./views/home.js";
import { renderRoom } from "./views/room.js";
import { renderAI } from "./views/ai.js";

const app = document.querySelector<HTMLDivElement>("#app")!;

function goHome(): void {
  // 返回首页时清除 URL 中的 room 参数
  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  window.history.replaceState(null, "", url.toString());
  renderHome(app, {
    onRoom: () => renderRoom(app, goHome),
    onAI: (difficulty) => renderAI(app, difficulty, goHome),
  });
}

// 支持通过分享链接直接加入房间（如 ?room=1234）
const params = new URLSearchParams(window.location.search);
const joinRoomId = params.get("room");

if (joinRoomId && /^\d{4}$/.test(joinRoomId)) {
  renderRoom(app, goHome, joinRoomId);
} else {
  goHome();
}
