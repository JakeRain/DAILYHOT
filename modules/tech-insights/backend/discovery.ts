import { sql } from "@aihot/backend/db";

export interface WeakSignalWakeupSummary {
  windowDays: number;
  scannedWeakSignals: number;
  wokenArticleIds: string[];
}

export interface TopicDiscoverySummary {
  windowDays: number;
  anchoredClustersCreated: number;
  observationClustersCreated: number;
  l3ProposalsCreated: number;
}

/**
 * Anti-miss recall: scans low-cost `tech_weak_signals` over a 14–30 day window.
 * When >= 3 independent sources converge semantically on the same emerging technical point,
 * wakes them up by marking `woken_at` and returning their articleIds to enqueue Stage 2 signal cards.
 *
 * TODO(company-integration):
 * Plug in your vector clustering / density detection logic over `tech_weak_signals.embedding_json`.
 */
export async function runWeakSignalWakeup(windowDays = 21): Promise<WeakSignalWakeupSummary> {
  const rows = await sql<{ article_id: string; source_id: string }[]>`
    SELECT article_id, source_id
    FROM tech_weak_signals
    WHERE woken_at IS NULL
      AND published_at >= now() - make_interval(days => ${windowDays})`;

  // Placeholder: real implementation clusters embeddings and wakes clusters with >= 3 distinct source_id values.
  return {
    windowDays,
    scannedWeakSignals: rows.length,
    wokenArticleIds: [],
  };
}

/**
 * Dual-pool Topic Discovery pipeline:
 * - Pool A (Anchored): aggregates signal cards under each active L3 over `windowDays` to detect momentum & breakthroughs.
 * - Pool B (Observation): clusters unanchored high-value signal cards (`observation_pool = true`);
 *   when a dense multi-source cluster emerges, creates a `tech_l3_proposals` row for admin approval.
 *
 * TODO(company-integration):
 * Connect your existing tech topic discovery pipeline here and write results to
 * `tech_topic_clusters` and `tech_l3_proposals`.
 */
export async function runTopicDiscovery(windowDays = 14): Promise<TopicDiscoverySummary> {
  const [counts] = await sql<{ anchored: number; observation: number }[]>`
    SELECT
      count(*) FILTER (WHERE NOT observation_pool)::int AS anchored,
      count(*) FILTER (WHERE observation_pool)::int AS observation
    FROM tech_signal_cards
    WHERE created_at >= now() - make_interval(days => ${windowDays})`;
  void counts;

  return {
    windowDays,
    anchoredClustersCreated: 0,
    observationClustersCreated: 0,
    l3ProposalsCreated: 0,
  };
}
