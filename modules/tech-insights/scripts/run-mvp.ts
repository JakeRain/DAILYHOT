/**
 * Phase 0 MVP Experiment Runner (Single-step LLM evaluation over 100-200 real tech articles).
 *
 * Usage:
 *   node modules/tech-insights/scripts/run-mvp.ts --input .data/tech-sample.jsonl --dry-run
 *   node --env-file=.env modules/tech-insights/scripts/run-mvp.ts \
 *     --input .data/tech-sample.jsonl \
 *     --out .data/mvp-signals.jsonl \
 *     --summary .data/mvp-top-signals.md
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { TechMaturitySchema, TopicEvidenceSchema, TriageStateSchema } from "../types.ts";

interface CoreTopic {
  id: string;
  l1: string;
  name: string;
  definition: string;
  exclude: string;
}

interface InputArticle {
  articleId: string;
  title: string;
  sourceName?: string;
  publishedAt?: string;
  body: string;
}

const MvpOutputSchema = z.object({
  triageState: TriageStateSchema,
  l3Ids: z.array(z.string()).default([]),
  topicEvidences: z.array(TopicEvidenceSchema).default([]),
  observationPool: z.boolean().default(false),
  problem: z.string().nullable().default(null),
  approach: z.string().nullable().default(null),
  delta: z.string().nullable().default(null),
  maturity: TechMaturitySchema.nullable().default(null),
  evidence: z.string().nullable().default(null),
  engineeringScore: z.number().min(0).max(100),
  frontierScore: z.number().min(0).max(100),
  rationale: z.string().default(""),
});
type MvpOutput = z.infer<typeof MvpOutputSchema>;

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    input: get("--input"),
    out: get("--out") ?? ".data/mvp-signals.jsonl",
    summary: get("--summary") ?? ".data/mvp-top-signals.md",
    topicsFile: get("--topics") ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "core-topics-v0.json"),
    limit: Number(get("--limit") ?? 200),
    dryRun: argv.includes("--dry-run"),
  };
}

function buildSystemPrompt(topics: CoreTopic[]): string {
  const topicLines = topics
    .map((t) => `- ${t.id} [${t.l1}] ${t.name}：${t.definition}（排除：${t.exclude}）`)
    .join("\n");

  return [
    "你是面向 OPPO 手机系统（ColorOS）架构部门（软硬件兼顾）的技术洞察分析员。",
    "请阅读单篇技术文章，对照以下 20 个核心关注主题，严格按 JSON 输出 6 态分流、双方向独立打分与紧凑信号卡。",
    "",
    "【强制防幻觉纪律】",
    "1. 归属必须基于正文中的技术对象与机制证据，不能只凭标题或术语共现；不匹配任何主题但有真实技术价值时，标为 OPEN_TOPIC_CANDIDATE 且 observationPool=true，绝不硬塞。",
    "2. 工程落地分（engineeringScore）与前沿启发分（frontierScore）必须分开打分，绝不合并抵消。",
    "3. evidence 只写原文明确给出的指标/实测/开源事实，无则填 null，严禁编造。",
    "4. LANDSCAPE_ONLY（仅发布事实无工程细节）和 INSUFFICIENT_MATERIAL（材料不足）不要强行编造工程问题。",
    "",
    "【核心主题列表】",
    topicLines,
    "",
    "【输出严格 JSON（不要 markdown 代码块外多余文字）】",
    '{"triageState":"MATCHED|MULTI_MATCHED|LANDSCAPE_ONLY|OPEN_TOPIC_CANDIDATE|INSUFFICIENT_MATERIAL|VALID_EMPTY","l3Ids":[],"topicEvidences":[{"topicId":"...","evidenceQuote":"..."}],"observationPool":false,"problem":"...","approach":"...","delta":"...","maturity":"paper|prototype|oss_adoption|production|null","evidence":"...|null","engineeringScore":0,"frontierScore":0,"rationale":"..."}',
  ].join("\n");
}

async function callOpenAiCompatible(systemPrompt: string, article: InputArticle): Promise<MvpOutput> {
  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com/v1").replace(/\/+$/, "");
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL ?? "deepseek-chat";
  if (!apiKey) throw new Error("Missing LLM_API_KEY in environment (.env)");

  const userContent = [
    `标题：${article.title}`,
    article.sourceName ? `来源：${article.sourceName}` : "",
    article.publishedAt ? `时间：${article.publishedAt}` : "",
    "正文：",
    article.body.slice(0, 12_000),
  ].filter(Boolean).join("\n");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  return MvpOutputSchema.parse(JSON.parse(raw));
}

function renderTopSummary(rows: Array<{ article: InputArticle; result: MvpOutput }>): string {
  const highValue = rows
    .filter((r) => r.result.engineeringScore >= 75 || r.result.frontierScore >= 80)
    .sort((a, b) => Math.max(b.result.engineeringScore, b.result.frontierScore) - Math.max(a.result.engineeringScore, a.result.frontierScore));

  const lines = [
    `# TechHOT Phase 0 MVP 高价值技术信号汇总（共扫描 ${rows.length} 篇，命中高价值 ${highValue.length} 篇）`,
    "",
    "> 筛选条件：`engineeringScore >= 75` 或 `frontierScore >= 80`。直接挑选条目 + 配合本周 3–5 条友商新闻即可组装第 1 期《TechHOT 技术洞察周报》。",
    "",
  ];

  for (const { article, result } of highValue) {
    lines.push(`## [${article.articleId}] ${article.title}`);
    lines.push(`- **状态**：\`${result.triageState}\` | **主题**：${result.l3Ids.length ? result.l3Ids.join(", ") : "开放候选池"} | **成熟度**：\`${result.maturity ?? "n/a"}\``);
    lines.push(`- **双方向评分**：工程落地 **${result.engineeringScore}** / 前沿启发 **${result.frontierScore}**`);
    if (result.problem) lines.push(`- **问题**：${result.problem}`);
    if (result.approach) lines.push(`- **方法**：${result.approach}`);
    if (result.delta) lines.push(`- **增量**：${result.delta}`);
    lines.push(`- **原文证据**：${result.evidence ?? "无量化实证"}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const topicsDoc = JSON.parse(readFileSync(args.topicsFile, "utf8")) as { topics: CoreTopic[] };
  const systemPrompt = buildSystemPrompt(topicsDoc.topics);

  if (!args.input) {
    console.log("Usage: node --env-file=.env modules/tech-insights/scripts/run-mvp.ts --input <articles.jsonl> [--dry-run]");
    console.log(`Loaded ${topicsDoc.topics.length} core L3 topics from ${args.topicsFile}`);
    return;
  }

  const lines = readFileSync(args.input, "utf8").split(/\r?\n/).filter((l) => l.trim());
  const articles = lines.slice(0, args.limit).map((l) => JSON.parse(l) as InputArticle);

  if (args.dryRun) {
    console.log(`[dry-run] Loaded ${topicsDoc.topics.length} core topics and ${articles.length} input articles.`);
    console.log(`[dry-run] System prompt length: ${systemPrompt.length} chars.`);
    console.log(`[dry-run] First article: ${articles[0]?.articleId ?? "none"} - ${articles[0]?.title ?? ""}`);
    return;
  }

  const results: Array<{ article: InputArticle; result: MvpOutput }> = [];
  for (const [idx, article] of articles.entries()) {
    console.log(`[${idx + 1}/${articles.length}] Evaluating ${article.articleId}...`);
    const result = await callOpenAiCompatible(systemPrompt, article);
    results.push({ article, result });
  }

  writeFileSync(args.out, results.map((r) => JSON.stringify({ ...r.article, ...r.result })).join("\n") + "\n", "utf8");
  writeFileSync(args.summary, renderTopSummary(results), "utf8");
  console.log(`Done! Saved JSONL to ${args.out} and summary to ${args.summary}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
