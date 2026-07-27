import { defineConfig } from "vite";
import { resolve } from "node:path";

// 前端根目录 src/client,构建产物输出到 dist/client 供 Express 托管
export default defineConfig({
  root: resolve(__dirname, "src/client"),
  base: "./",
  build: {
    outDir: resolve(__dirname, "dist/client"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // 开发模式下把 Socket.IO 请求代理到后端
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
  },
});
