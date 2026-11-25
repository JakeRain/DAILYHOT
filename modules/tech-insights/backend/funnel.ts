import { randomUUID } from "node:crypto";
import { sql } from "@aihot/backend/db";
import type { DeepRagComparison, Stage1TriageResult, TechSignalCard, TriageDecision, TriageState } from "../types.ts";
import { listTaxonomyNodes } from "./taxonomy.ts";

export interface Stage1RoutingThresholds {
  /** Direct pass to Stage 2 if treeRelevance >= this value. */
  directRelevanceMin: number;
  /** Direct pass to Stage 2 (into observation pool if off-tree) if techNovelty >= this value. */
  directNoveltyMin: number;
  /** Minimum novelty to keep in the low-cost weak-signal vector pool. */
  weakPoolNoveltyMin: number;
}

export const DEFAULT_ROUTING_THRESHOLDS: Stage1RoutingThresholds = {
  directRelevanceMin: 68,
  directNoveltyMin: 72,
  weakPoolNoveltyMin: 45,
};

/**
 * Pure decoupled routing function aligned with V1.0 6-state triage:
 * - Never penalizes an article for not fitting the current 3-layer taxonomy tree.
 * - `INSUFFICIENT_MATERIAL` and `LANDSCAPE_ONLY` never fabricate engineering claims;
 *   `VALID_EMPTY` / noise drops; high relevance OR high novelty -> `signal_card`;
 *   mid-novelty OR core source (T1) -> `weak_signal` vector pool for multi-source wakeup.
 */
export function decideStage1Route(input: {
  isNoise: boolean;
  triageState?: TriageState;
  treeRelevance: number;
  techNovelty: number;
  isCoreSource: boolean;
}, thresholds: Stage1RoutingThresholds = DEFAULT_ROUTING_THRESHOLDS): TriageDecision {
  if (input.isNoise || input.triageState === "VALID_EMPTY") return "drop";
  if (input.triageState === "INSUFFICIENT_MATERIAL") return "weak_signal";
  if (input.treeRelevance >= thresholds.directRelevanceMin || input.techNovelty >= thresholds.directNoveltyMin) {
    return "signal_card";
  }
  if (input.isCoreSource || input.techNovelty >= thresholds.weakPoolNoveltyMin) {
    return "weak_signal";
  }
  return "drop";
}

/**
 * Stage 1: Lightweight recall + 3-layer taxonomy anchoring + decoupled scoring (6-state triage).
 *
 * TODO(company-integration):
 * 1. Read article title/summary/body and source tier from `articles` + `sources`.
 * 2. Recall Top 8-12 active/incubating L3 (core) or L2 (focus/watch) nodes via clues + embedding similarity.
 * 3. Call the `techAnchor` model step (via `@aihot/backend/providers/llm` + receipts) with `prompts/stage1-anchor.md`.
 * 4. Compute `decision = decideStage1Route(...)`, persist to `tech_article_triage`:
 *    - If `signal_card`: enqueue `stage2-signal-card`.
 *    - If `weak_signal`: compute cheap title+abstract embedding and persist to `tech_weak_signals`.
 */
export async function runStage1Anchor(articleId: string): Promise<Stage1TriageResult> {
  const taxonomy = await listTaxonomyNodes("active");
  void taxonomy;

  const placeholder: Stage1TriageResult = {
    articleId,
    isNoise: false,
    triageState: "OPEN_TOPIC_CANDIDATE",
    treeRelevance: 0,
    techNovelty: 0,
    candidateL3Ids: [],
    rationale: "TODO(company-integration): connect Stage 1 anchor model + V1.0 6-state boundary prompt",
    decision: "weak_signal",
  };

  await sql`
    INSERT INTO tech_article_triage (article_id, is_noise, triage_state, tree_relevance, tech_novelty, candidate_l3_ids, rationale, decision)
    VALUES (${placeholder.articleId}, ${placeholder.isNoise}, ${placeholder.triageState}, ${placeholder.treeRelevance}, ${placeholder.techNovelty},
            ${placeholder.candidateL3Ids}, ${placeholder.rationale}, ${placeholder.decision})
    ON CONFLICT (article_id) DO UPDATE SET
      is_noise = EXCLUDED.is_noise,
      triage_state = EXCLUDED.triage_state,
      tree_relevance = EXCLUDED.tree_relevance,
      tech_novelty = EXCLUDED.tech_novelty,
      candidate_l3_ids = EXCLUDED.candidate_l3_ids,
      rationale = EXCLUDED.rationale,
      decision = EXCLUDED.decision,
      updated_at = now()`;

  return placeholder;
}

/**
 * Stage 2: Extract compact standardized Tech Signal Card with SEPARATE engineering & frontier scores.
 *
 * TODO(company-integration):
 * 1. Migrate the semantic extraction step from your existing 6-stage pipeline here, stripped down to TechSignalCardSchema.
 * 2. Call `techSignalCard` model step with `prompts/stage2-signal-card.md` + candidate L2/L3 inherited boundaries.
 * 3. Keep `engineeringScore` and `frontierScore` independent (do NOT average them together); `valueScore = Math.max(...)`.
 * 4. Each matched topic in `topicEvidences` MUST carry its own independent quote from the article body.
 * 5. Update `tech_taxonomy_nodes.last_hit_at` for matched topics so lifecycle GC tracks freshness.
 */
export async function runStage2SignalCard(articleId: string, options: { wokenFromWeakPool?: boolean } = {}): Promise<TechSignalCard> {
  const id = `sig_${randomUUID().slice(0, 10)}`;
  const placeholder: TechSignalCard = {
    id,
    articleId,
    l3Ids: [],
    topicEvidences: [],
    observationPool: true,
    problem: "TODO(company-integration): extracted technical problem",
    approach: "TODO(company-integration): extracted technical approach",
    delta: "TODO(company-integration): extracted technical delta",
    maturity: "paper",
    evidence: null,
    engineeringScore: 0,
    frontierScore: 0,
    valueScore: 0,
    wokenFromWeakPool: Boolean(options.wokenFromWeakPool),
  };

  await sql`
    INSERT INTO tech_signal_cards (
      id, article_id, l3_ids, topic_evidences_json, observation_pool,
      problem, approach, delta, maturity, evidence,
      engineering_score, frontier_score, value_score, woken_from_weak_pool
    )
    VALUES (
      ${id}, ${placeholder.articleId}, ${placeholder.l3Ids}, ${sql.json(placeholder.topicEvidences as unknown as Record<string, never>[])},
      ${placeholder.observationPool}, ${placeholder.problem}, ${placeholder.approach}, ${placeholder.delta},
      ${placeholder.maturity}, ${placeholder.evidence},
      ${placeholder.engineeringScore}, ${placeholder.frontierScore}, ${placeholder.valueScore}, ${placeholder.wokenFromWeakPool}
    )
    ON CONFLICT (article_id) DO UPDATE SET
      l3_ids = EXCLUDED.l3_ids,
      topic_evidences_json = EXCLUDED.topic_evidences_json,
      observation_pool = EXCLUDED.observation_pool,
      problem = EXCLUDED.problem,
      approach = EXCLUDED.approach,
      delta = EXCLUDED.delta,
      maturity = EXCLUDED.maturity,
      evidence = EXCLUDED.evidence,
      engineering_score = EXCLUDED.engineering_score,
      frontier_score = EXCLUDED.frontier_score,
      value_score = EXCLUDED.value_score,
      woken_from_weak_pool = EXCLUDED.woken_from_weak_pool,
      updated_at = now()`;

  return placeholder;
}

/**
 * Stage 3: On-demand heavy RAG & historical comparison (ONLY for top breakthroughs or weekly report candidates).
 *
 * TODO(company-integration):
 * 1. Migrate your existing RAG + rerank comparison logic here.
 * 2. Retrieve historical signal cards in the same L3 over the past 3-6 months.
 * 3. Call `techDeepRag` model step with `prompts/stage3-deep-rag.md` and persist into `deep_rag_json`.
 */
export async function runStage3DeepRag(subjectType: "signal_card" | "topic_cluster", subjectId: string): Promise<DeepRagComparison> {
  const result: DeepRagComparison = {
    subjectType,
    subjectId,
    isBreakthrough: false,
    historicalContext: "TODO(company-integration): connect existing RAG + rerank historical comparison",
    keyDifferences: [],
    comparedSignalIds: [],
  };

  if (subjectType === "signal_card") {
    await sql`UPDATE tech_signal_cards SET deep_rag_json = ${sql.json(result as unknown as Record<string, never>)}, updated_at = now() WHERE id = ${subjectId}`;
  } else {
    await sql`UPDATE tech_topic_clusters SET deep_rag_json = ${sql.json(result as unknown as Record<string, never>)} WHERE id = ${subjectId}`;
  }
  return result;
}
