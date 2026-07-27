import { BOARD_SIZE, type Cell, type Difficulty, type Point, type Stone } from "../../shared/types.js";
import { canPlace } from "../../shared/rules.js";

const API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
const TIMEOUT_MS = 15000;

/** AI 决策异常(超时、非法坐标、解析失败等),调用方据此直接结束对局 */
export class AIError extends Error {}

/** 不同难度对应的策略提示 */
const DIFFICULTY_PROMPT: Record<Difficulty, string> = {
  easy: "你是五子棋新手。只做基础的进攻和防守,允许偶尔走次优的一手,不必追求最优。",
  medium:
    "你是五子棋中等水平玩家。要兼顾进攻与防守,阻止对手形成活三、活四,同时发展自己的连子。",
  hard: "你是五子棋高手。务必以最优策略应对:优先阻断对手的活四和冲四,警惕对手活三,同时积极构建自己的多重威胁(双三、四三)争取获胜。",
};

/** 把棋盘渲染成文本(供模型理解),. 空位,X 黑,O 白 */
function boardToText(board: Cell[][]): string {
  const rows: string[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    let row = "";
    for (let x = 0; x < BOARD_SIZE; x++) {
      const c = board[y][x];
      row += c === "black" ? "X" : c === "white" ? "O" : ".";
    }
    rows.push(`${String(y).padStart(2, " ")} ${row}`);
  }
  const header = "   " + Array.from({ length: BOARD_SIZE }, (_, i) => i % 10).join("");
  return `${header}\n${rows.join("\n")}`;
}

/**
 * 请求 DeepSeek 为 aiColor 计算下一手落子坐标。
 * 失败(网络/超时/解析/非法坐标)一律抛出 AIError。
 */
export async function requestAIMove(
  board: Cell[][],
  aiColor: Stone,
  difficulty: Difficulty
): Promise<Point> {
  if (!API_KEY) throw new AIError("未配置 DEEPSEEK_API_KEY");

  const aiMark = aiColor === "black" ? "X" : "O";
  const oppMark = aiColor === "black" ? "O" : "X";
  const systemPrompt = `${DIFFICULTY_PROMPT[difficulty]}
棋盘为 ${BOARD_SIZE}×${BOARD_SIZE},坐标 x 为列(0-${BOARD_SIZE - 1}),y 为行(0-${BOARD_SIZE - 1})。
你执子标记为 ${aiMark},对手为 ${oppMark},"." 表示空位。
只能落在空位。先在横、竖、斜任一方向连成 5 子者获胜。
只返回一个 JSON 对象,格式为 {"x": 数字, "y": 数字},不要任何多余文字。`;

  const userPrompt = `当前棋盘(行首数字为 y 行号,列号见表头):\n${boardToText(board)}\n请给出你(${aiMark})的下一手落子坐标。`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: difficulty === "easy" ? 1.0 : 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new AIError(e instanceof Error && e.name === "AbortError" ? "AI 响应超时" : "AI 请求失败");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new AIError(`AI 服务返回错误 ${res.status}`);

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AIError("AI 返回内容为空");

  const point = parsePoint(content);
  if (!point || !canPlace(board, point.x, point.y)) {
    throw new AIError("AI 返回了非法坐标");
  }
  return point;
}

/** 从模型返回文本中解析 {x, y} */
function parsePoint(content: string): Point | null {
  try {
    const obj = JSON.parse(content) as { x?: unknown; y?: unknown };
    if (typeof obj.x === "number" && typeof obj.y === "number") {
      return { x: obj.x, y: obj.y };
    }
  } catch {
    // 尝试从文本中提取第一个 {...}
    const match = content.match(/\{[^}]*\}/);
    if (match) {
      try {
        const obj = JSON.parse(match[0]) as { x?: unknown; y?: unknown };
        if (typeof obj.x === "number" && typeof obj.y === "number") {
          return { x: obj.x, y: obj.y };
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}
