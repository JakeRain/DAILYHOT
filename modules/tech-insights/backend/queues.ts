import { defineQueue } from "@aihot/backend/modules";

export interface Stage1AnchorJob {
  articleId: string;
}

export interface Stage2SignalCardJob {
  articleId: string;
  wokenFromWeakPool?: boolean;
}

export interface Stage3DeepRagJob {
  subjectType: "signal_card" | "topic_cluster";
  subjectId: string;
}

export interface TopicDiscoveryJob {
  windowDays: number;
}

export interface ReportDraftJob {
  periodKind: "weekly" | "biweekly";
  periodStart: string;
  periodEnd: string;
}

/**
 * Queue definitions for the tech-insights module.
 * Worker handlers are attached in server.ts so business modules can enqueue without circular imports.
 */
export const TECH_QUEUE_NAMES = {
  stage1Anchor: "tech-insights.stage1-anchor",
  stage2SignalCard: "tech-insights.stage2-signal-card",
  stage3DeepRag: "tech-insights.stage3-deep-rag",
  topicDiscovery: "tech-insights.topic-discovery",
  reportDraft: "tech-insights.report-draft",
} as const;

export function createTechQueues(handlers: {
  onStage1Anchor: (jobs: Stage1AnchorJob[]) => Promise<void>;
  onStage2SignalCard: (jobs: Stage2SignalCardJob[]) => Promise<void>;
  onStage3DeepRag: (jobs: Stage3DeepRagJob[]) => Promise<void>;
  onTopicDiscovery: (jobs: TopicDiscoveryJob[]) => Promise<void>;
  onReportDraft: (jobs: ReportDraftJob[]) => Promise<void>;
}) {
  return {
    stage1Anchor: defineQueue<Stage1AnchorJob>({
      name: TECH_QUEUE_NAMES.stage1Anchor,
      options: { policy: "short", retryLimit: 3, retryDelay: 30, retryBackoff: true, expireInSeconds: 300 },
      worker: { batchSize: 5 },
      run: handlers.onStage1Anchor,
    }),
    stage2SignalCard: defineQueue<Stage2SignalCardJob>({
      name: TECH_QUEUE_NAMES.stage2SignalCard,
      options: { policy: "short", retryLimit: 3, retryDelay: 30, retryBackoff: true, expireInSeconds: 600 },
      worker: { batchSize: 3 },
      run: handlers.onStage2SignalCard,
    }),
    stage3DeepRag: defineQueue<Stage3DeepRagJob>({
      name: TECH_QUEUE_NAMES.stage3DeepRag,
      options: { policy: "short", retryLimit: 2, retryDelay: 60, retryBackoff: true, expireInSeconds: 900 },
      worker: { batchSize: 1 },
      run: handlers.onStage3DeepRag,
    }),
    topicDiscovery: defineQueue<TopicDiscoveryJob>({
      name: TECH_QUEUE_NAMES.topicDiscovery,
      options: { policy: "singleton", retryLimit: 1, retryDelay: 120, expireInSeconds: 1800 },
      worker: { batchSize: 1 },
      run: handlers.onTopicDiscovery,
    }),
    reportDraft: defineQueue<ReportDraftJob>({
      name: TECH_QUEUE_NAMES.reportDraft,
      options: { policy: "singleton", retryLimit: 1, retryDelay: 120, expireInSeconds: 1800 },
      worker: { batchSize: 1 },
      run: handlers.onReportDraft,
    }),
  };
}
