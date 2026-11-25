import { z } from "zod";

export const TaxonomyLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type TaxonomyLevel = z.infer<typeof TaxonomyLevelSchema>;

export const AttentionWeightSchema = z.enum(["core", "focus", "watch"]);
export type AttentionWeight = z.infer<typeof AttentionWeightSchema>;

export const TaxonomyStatusSchema = z.enum(["active", "proposed", "archived"]);
export type TaxonomyStatus = z.infer<typeof TaxonomyStatusSchema>;

export interface TaxonomyNode {
  id: string;
  parentId: string | null;
  level: TaxonomyLevel;
  name: string;
  definition: string;
  includeExamples: string[];
  excludeBoundaries: string[];
  attentionWeight: AttentionWeight;
  status: TaxonomyStatus;
  createdAt: string;
  updatedAt: string;
}

export const TriageDecisionSchema = z.enum(["drop", "weak_signal", "signal_card"]);
export type TriageDecision = z.infer<typeof TriageDecisionSchema>;

/** Stage 1 output: decouples fit-to-tree from pure technical novelty so early breakthroughs are never penalized. */
export const Stage1TriageResultSchema = z.object({
  articleId: z.string(),
  isNoise: z.boolean(),
  treeRelevance: z.number().min(0).max(100),
  techNovelty: z.number().min(0).max(100),
  candidateL3Ids: z.array(z.string()),
  rationale: z.string(),
  decision: TriageDecisionSchema,
});
export type Stage1TriageResult = z.infer<typeof Stage1TriageResultSchema>;

export const TechMaturitySchema = z.enum(["paper", "prototype", "oss_adoption", "production"]);
export type TechMaturity = z.infer<typeof TechMaturitySchema>;

/** Stage 2 output: compact standardized Tech Signal Card feeding dashboard, topic discovery, and report drafts. */
export const TechSignalCardSchema = z.object({
  id: z.string().optional(),
  articleId: z.string(),
  l3Ids: z.array(z.string()),
  observationPool: z.boolean(),
  problem: z.string().min(1),
  approach: z.string().min(1),
  delta: z.string().min(1),
  maturity: TechMaturitySchema,
  evidence: z.string().nullable(),
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

export const ReportClaimSchema = z.object({
  text: z.string().min(1),
  /** Every claim in a management report must cite at least one real TechSignalCard ID. */
  signalIds: z.array(z.string().min(1)).min(1),
  /** Optional industry news story IDs from the native news track as market/competitor corroboration. */
  relatedStoryIds: z.array(z.number().int()).default([]),
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
