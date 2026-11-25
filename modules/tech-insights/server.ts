import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { enqueueOn } from "@aihot/backend/jobs/queue";
import { defineServerModule } from "@aihot/backend/modules";
import { runTopicDiscovery, runWeakSignalWakeup } from "./backend/discovery.ts";
import { runStage1Anchor, runStage2SignalCard, runStage3DeepRag } from "./backend/funnel.ts";
import { registerTechInsightsHttp } from "./backend/http.ts";
import { createTechQueues } from "./backend/queues.ts";
import { generateReportDraft } from "./backend/reports.ts";
import { runLifecycleGc } from "./backend/taxonomy.ts";
import { TECHHOT_DEMO } from "./demo-data.ts";

const queues = createTechQueues({
  onStage1Anchor: async (jobs) => {
    for (const job of jobs) {
      const triage = await runStage1Anchor(job.articleId);
      if (triage.decision === "signal_card") {
        await enqueueOn(queues.stage2SignalCard, { articleId: job.articleId });
      }
    }
  },
  onStage2SignalCard: async (jobs) => {
    for (const job of jobs) {
      const card = await runStage2SignalCard(job.articleId, { wokenFromWeakPool: job.wokenFromWeakPool });
      if (card.id && (card.engineeringScore >= 85 || card.frontierScore >= 85)) {
        await enqueueOn(queues.stage3DeepRag, { subjectType: "signal_card", subjectId: card.id });
      }
    }
  },
  onStage3DeepRag: async (jobs) => {
    for (const job of jobs) {
      await runStage3DeepRag(job.subjectType, job.subjectId);
    }
  },
  onTopicDiscovery: async (jobs) => {
    const windowDays = jobs[0]?.windowDays ?? 14;
    const wakeup = await runWeakSignalWakeup(Math.max(windowDays, 21));
    for (const articleId of wakeup.wokenArticleIds) {
      await enqueueOn(queues.stage2SignalCard, { articleId, wokenFromWeakPool: true });
    }
    await runTopicDiscovery(windowDays);
  },
  onReportDraft: async (jobs) => {
    for (const job of jobs) {
      await generateReportDraft(job);
    }
  },
});

export default defineServerModule({
  name: "tech-insights",
  sourceUses: {
    tech_insight: { label: "技术洞察", minutes: 60 },
  },
  models: {
    techAnchor: { label: "TechHOT·Stage1锚定与6态分诊", env: "TECH_ANCHOR_MODEL", purposes: ["tech_anchor"] },
    techSignalCard: { label: "TechHOT·Stage2双方向信号卡", env: "TECH_SIGNAL_CARD_MODEL", purposes: ["tech_signal_card"] },
    techDeepRag: { label: "TechHOT·Stage3深度RAG对照", env: "TECH_DEEP_RAG_MODEL", purposes: ["tech_deep_rag"] },
    techReportDraft: { label: "TechHOT·周报草稿", env: "TECH_REPORT_DRAFT_MODEL", purposes: ["tech_report_draft"] },
  },
  queues: [
    queues.stage1Anchor,
    queues.stage2SignalCard,
    queues.stage3DeepRag,
    queues.topicDiscovery,
    queues.reportDraft,
  ],
  schedules: [
    {
      name: "tech-insights.daily-discovery",
      cron: "30 2 * * *",
      missed: "skip",
      run: () => enqueueOn(queues.topicDiscovery, { windowDays: 14 }),
    },
    {
      name: "tech-insights.weekly-lifecycle-gc",
      cron: "0 4 * * 1",
      missed: "skip",
      run: () => runLifecycleGc(),
    },
    {
      name: "tech-insights.weekly-draft",
      cron: "0 15 * * 5",
      missed: "once",
      run: () => {
        const end = new Date();
        const start = new Date(end.getTime() - 7 * 86_400_000);
        return enqueueOn(queues.reportDraft, {
          periodKind: "weekly",
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
        });
      },
    },
  ],
  http: registerTechInsightsHttp,
  agent: {
    abilities: [
      {
        path: "/tech-insights/latest",
        title: "最新技术洞察周报",
        ask: "最近一期面向技术管理层的 TechHOT 技术洞察周报是什么",
        etagPrefix: "tech-insights-latest",
        cacheControl: "public, max-age=300",
        answer: async () => {
          const [report] = await sql<{ title: string; published_at: Date | null }[]>`
            SELECT title, published_at FROM tech_insight_reports WHERE status = 'published' ORDER BY published_at DESC LIMIT 1`;
          if (!report) {
            const demo = TECHHOT_DEMO.reports[0]!;
            return `# ${demo.title} (Demo)\n\n发布时间：${demo.publishedAt}`;
          }
          return `# ${report.title}\n\n发布时间：${report.published_at?.toISOString() ?? "未知"}`;
        },
        mcp: {
          tool: "get_latest_tech_insight_report",
          use: "for the latest published TechHOT insight report",
          description: "返回最新一期已发布的 TechHOT 技术洞察周报/双周报摘要。",
          input: z.object({}),
          run: async () => {
            const [report] = await sql<{ id: string; title: string; published_at: Date | null; body_json: Record<string, unknown> }[]>`
              SELECT id, title, published_at, body_json FROM tech_insight_reports WHERE status = 'published' ORDER BY published_at DESC LIMIT 1`;
            if (!report) {
              const demo = TECHHOT_DEMO.reports[0]!;
              return { text: `# ${demo.title} (Demo)\n\nID: ${demo.id}`, structured: { demo: true, report: demo } };
            }
            return {
              text: `# ${report.title}\n\nID: ${report.id}`,
              structured: { demo: false, report },
            };
          },
        },
      },
    ],
  },
});
