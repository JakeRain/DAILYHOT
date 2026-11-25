import { z } from "zod";

export const TaxonomyLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type TaxonomyLevel = z.infer<typeof TaxonomyLevelSchema>;

/** Three concentric priority rings: core (deep L3), focus (support L2/L3), watch (broad L2 radar). */
export const AttentionWeightSchema = z.enum(["core", "focus", "watch"]);
export type AttentionWeight = z.infer<typeof AttentionWeightSchema>;

/** 5-state topic lifecycle to support dynamic growth AND automatic/governed retirement. */
export const LifecycleStatusSchema = z.enum(["proposed", "incubating", "active", "dormant", "retired"]);
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;

/** Legacy alias kept compatible with existing columns. */
export const TaxonomyStatusSchema = z.enum(["active", "proposed", "archived"]);
export type TaxonomyStatus = z.infer<typeof TaxonomyStatusSchema>;

export interface TaxonomyNode {
  /** Immutable topic ID (e.g. D08, D08.01, D08.01.001). Never reused once published. */
  id: string;
  parentId: string | null;
  level: TaxonomyLevel;
  name: string;
  nameEn: string;
  definition: string;
  includeExamples: string[];
  excludeBoundaries: string[];
  engineeringFocus: string;
  frontierFocus: string;
  clues: string[];
  attentionWeight: AttentionWeight;
  lifecycleStatus: LifecycleStatus;
  /** Strategic lock: prevents automatic transition to `dormant` during lifecycle GC. */
  pinned: boolean;
  /** When merged into another node and retired, preserves historical lineage mapping. */
  mergedIntoId: string | null;
  lastHitAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 6-state article triage aligned with TechSensing-hot V1.0 specification. */
export const TriageStateSchema = z.enum([
  "MATCHED",
  "MULTI_MATCHED",
  "LANDSCAPE_ONLY",
  "OPEN_TOPIC_CANDIDATE",
  "INSUFFICIENT_MATERIAL",
  "VALID_EMPTY",
]);
export type TriageState = z.infer<typeof TriageStateSchema>;

export const TriageDecisionSchema = z.enum(["drop", "weak_signal", "signal_card"]);
export type TriageDecision = z.infer<typeof TriageDecisionSchema>;

/** Stage 1 output: decouples fit-to-tree from pure technical novelty so early breakthroughs are never penalized. */
export const Stage1TriageResultSchema = z.object({
  articleId: z.string(),
  isNoise: z.boolean(),
  triageState: TriageStateSchema,
  treeRelevance: z.number().min(0).max(100),
  techNovelty: z.number().min(0).max(100),
  candidateL3Ids: z.array(z.string()),
  rationale: z.string(),
  decision: TriageDecisionSchema,
});
export type Stage1TriageResult = z.infer<typeof Stage1TriageResultSchema>;

export const TechMaturitySchema = z.enum(["paper", "prototype", "oss_adoption", "production"]);
export type TechMaturity = z.infer<typeof TechMaturitySchema>;

export const TopicEvidenceSchema = z.object({
  topicId: z.string().min(1),
  evidenceQuote: z.string().min(1),
});
export type TopicEvidence = z.infer<typeof TopicEvidenceSchema>;

/**
 * Stage 2 output: compact standardized Tech Signal Card.
 * Engineering landing value and Frontier inspiration value are scored SEPARATELY and never averaged away.
 */
export const TechSignalCardSchema = z.object({
  id: z.string().optional(),
  articleId: z.string(),
  title: z.string().optional(),
  sourceName: z.string().optional(),
  publishedAt: z.string().optional(),
  l3Ids: z.array(z.string()),
  topicEvidences: z.array(TopicEvidenceSchema).default([]),
  observationPool: z.boolean(),
  problem: z.string().min(1),
  approach: z.string().min(1),
  delta: z.string().min(1),
  maturity: TechMaturitySchema,
  evidence: z.string().nullable(),
  /** Engineering landing value (0-100): solves real perf/cost/power/reliability constraints. */
  engineeringScore: z.number().min(0).max(100),
  /** Frontier inspiration value (0-100): proposes new mechanism/architecture/paradigm. */
  frontierScore: z.number().min(0).max(100),
  /** Peak of the two independent axes for quick sorting without offsetting either axis. */
  valueScore: z.number().min(0).max(100),
  wokenFromWeakPool: z.boolean().default(false),
});
export type TechSignalCard = z.infer<typeof TechSignalCardSchema>;

export interface DeepRagComparison {
  subjectType: "signal_card" | "topic_cluster";
  subjectId: string;
  isBreakthrough: boolean;
  historicalContext: string;
  keyDifferences: string[];
  comparedSignalIds: string[];
}

export type QuadrantTag = "tech_hot_rival_active" | "tech_hot_rival_quiet" | "rival_hype_low_tech" | "weak_signal_wakeup";

export interface RelatedIntelEvent {
  storyId: number;
  company: string;
  title: string;
  date: string;
}

export interface TopicCluster {
  id: string;
  pool: "anchored" | "observation";
  l3Id: string | null;
  title: string;
  summary: string;
  signalIds: string[];
  independentSourceCount: number;
  momentumScore: number;
  windowDays: number;
  quadrant?: QuadrantTag;
  relatedIntel?: RelatedIntelEvent[];
  createdAt: string;
}

export interface L3Proposal {
  id: string;
  clusterId: string;
  suggestedParentL2Id: string | null;
  proposedName: string;
  proposedDefinition: string;
  supportingSignalIds: string[];
  status: "pending" | "approved" | "merged" | "rejected";
  reviewNote: string | null;
  createdAt: string;
}

export interface LifecycleGcDecision {
  nodeId: string;
  from: LifecycleStatus;
  to: LifecycleStatus;
  reason: string;
}

export const ReportClaimSchema = z.object({
  text: z.string().min(1),
  /** Every claim in a management report must cite at least one real TechSignalCard ID. */
  signalIds: z.array(z.string().min(1)).min(1),
  /** Optional industry news story IDs from the native news track as market/competitor corroboration. */
  relatedStoryIds: z.array(z.number().int()).default([]),
  actionHint: z.string().optional(),
});
export type ReportClaim = z.infer<typeof ReportClaimSchema>;

export const InsightReportSectionSchema = z.object({
  l1Id: z.string().nullable(),
  heading: z.string().min(1),
  summary: z.string().min(1),
  claims: z.array(ReportClaimSchema),
});
export type InsightReportSection = z.infer<typeof InsightReportSectionSchema>;

export const InsightReportBodySchema = z.object({
  executiveSummary: z.array(ReportClaimSchema),
  sections: z.array(InsightReportSectionSchema),
  emergingSignals: z.array(ReportClaimSchema),
});
export type InsightReportBody = z.infer<typeof InsightReportBodySchema>;

export interface InsightReport {
  id: string;
  periodKind: "weekly" | "biweekly";
  periodStart: string;
  periodEnd: string;
  title: string;
  status: "draft" | "published" | "archived";
  body: InsightReportBody;
  publishedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
