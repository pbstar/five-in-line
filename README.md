# 五子棋 · 移动端 H5 小游戏

一个轻量的移动端五子棋 H5 游戏,支持**房间对战**与**人机对决**两种模式。技术栈以简单轻量为原则:Node.js + TypeScript + Socket.IO,前端原生 HTML + TypeScript + Canvas,无前端框架依赖。

---

## 一、功能概览

### 1. 房间对战(双人实时对战)
- **创建房间**:自动分配一个 4 位数字房间号(1000–9999,不重复),创建者进入房间等待对手。
- **加入房间**:输入 4 位房间号加入他人创建的房间,满 2 人自动开局。
- **实时对弈**:通过 Socket.IO 实时同步落子,先连成五子者获胜。
- **掉线判负**:任意一方断开连接即判负,对局结束(不支持断线重连)。

### 2. 人机对决(单人对战 AI)
- **三档难度**:简单 / 中等 / 困难,难度影响 AI 落子策略。
- **AI 引擎**:调用 DeepSeek `deepseek-v4-flash` 模型进行决策。
  - 服务端封装棋盘状态 → 请求模型 → 解析落子坐标,前端不直接暴露 API Key。
  - AI 返回异常(超时/非法坐标)时直接结束当前对局并提示,不做兜底。

---

## 二、技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 运行时 | Node.js (LTS) | 服务端运行环境 |
| 语言 | TypeScript | 前后端统一使用 TS |
| Web 服务 | Express | 静态资源托管 |
| 实时通信 | Socket.IO | 房间对战实时落子同步 |
| AI 模型 | DeepSeek `deepseek-v4-flash` | 人机对决决策 |
| 前端 | 原生 HTML + TS + Canvas | 无框架,棋盘 Canvas 绘制,移动端适配 |
| 构建 | Vite / esbuild(前端)+ tsc(后端) | 轻量构建 |

---

## 三、项目结构(规划)

```
five-in-line/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example              # 环境变量示例(DeepSeek Key、端口等)
├── src/
│   ├── server/               # 后端
│   │   ├── index.ts          # 入口:Express + Socket.IO 启动
│   │   ├── socket/
│   │   │   └── room.ts       # 房间对战:创建/加入/落子/胜负/掉线
│   │   ├── ai/
│   │   │   └── deepseek.ts   # DeepSeek 调用封装
│   │   └── game/
│   │       └── rules.ts      # 五子棋核心规则(胜负判定,前后端复用)
│   └── client/               # 前端
│       ├── index.html        # 首页(模式选择)
│       ├── styles/
│       ├── main.ts           # 入口 + 路由(简单页面切换)
│       ├── board.ts          # Canvas 棋盘绘制与交互
│       ├── socket.ts         # 前端 Socket.IO 封装
│       └── views/            # 各页面:房间、对战、人机
└── shared/
    └── types.ts              # 前后端共享类型定义
```

> 前后端复用五子棋规则(`rules.ts`)与类型(`shared/types.ts`),避免逻辑分叉。

---

## 四、核心玩法规则

- 棋盘:15 × 15(标准五子棋),Canvas 绘制,移动端点击/触摸落子。
- 胜负:横、竖、斜任一方向连成 5 子即胜。
- 房间对战:创建者执黑先手,加入者执白。
- 服务端为权威裁判:所有落子由服务端校验合法性并判定胜负,防作弊。

---

## 五、通信协议(Socket.IO 事件,规划)

**客户端 → 服务端**
- `room:create` — 创建房间,返回房间号
- `room:join` `{ roomId }` — 加入房间
- `game:move` `{ roomId, x, y }` — 落子

**服务端 → 客户端**
- `room:created` `{ roomId }`
- `room:joined` `{ roomId, color }` — 分配黑/白
- `game:start` — 双方就绪,开局
- `game:move` `{ x, y, color }` — 同步对方落子
- `game:over` `{ winner, reason }` — 对局结束(reason: win / disconnect)
- `room:error` `{ message }` — 房间号不存在、已满等错误

---

## 六、人机对决 · AI 策略

| 难度 | 策略 |
|---|---|
| 简单 | 提示模型只做基础攻防,偶尔次优 |
| 中等 | 模型正常博弈,兼顾进攻与防守 |
| 困难 | 模型全力最优,强调防守对手活四/活三与自身连子 |

- 请求流程:前端发送当前棋盘 → 服务端组装 prompt 调用 DeepSeek → 解析返回坐标 → 校验合法后落子。
- 异常处理:模型超时、返回非法坐标或解析失败时,直接结束当前对局并提示,不做本地兜底。

---

## 七、环境变量(`.env`)

```
PORT=3000
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

---

## 八、运行方式(规划)

```bash
# 安装依赖
npm install

# 开发模式(前端 + 后端热更新)
npm run dev

# 构建
npm run build

# 生产启动
npm start
```

访问:`http://localhost:3000`(移动端可用局域网 IP 访问,或部署后用手机浏览器打开)。

---

## 九、开发计划(里程碑)

- [ ] M1 项目脚手架:TS 工程、Express + Socket.IO
- [ ] M2 五子棋核心:Canvas 棋盘、落子交互、胜负判定(本地可玩)
- [ ] M3 房间对战:创建/加入房间、实时同步、掉线判负
- [ ] M4 人机对决:三档难度、DeepSeek 接入
- [ ] M5 移动端适配与打磨:触摸体验、页面切换、UI 优化

---

## 十、技术决策(已确认)

1. **DeepSeek `deepseek-v4-flash` 接入方式**:兼容 OpenAI Chat Completions 协议,按该协议对接(API Key、Base URL 由 `.env` 配置)。
2. **AI 响应延迟**:调用大模型有网络延迟,人机对决落子可能有 1–3 秒等待,前端在 AI 回合展示"AI 思考中"提示。

---

> 请审核以上方案。确认后我将从 **M1 脚手架**开始逐步实现。
