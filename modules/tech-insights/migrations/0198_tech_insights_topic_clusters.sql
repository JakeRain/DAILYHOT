CREATE TABLE IF NOT EXISTS tech_topic_clusters (
  id text PRIMARY KEY,
  pool text NOT NULL CHECK (pool IN ('anchored', 'observation')),
  l3_id text REFERENCES tech_taxonomy_nodes(id),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  signal_ids text[] NOT NULL DEFAULT '{}'::text[],
  independent_source_count integer NOT NULL DEFAULT 0,
  momentum_score double precision NOT NULL DEFAULT 0,
  window_days integer NOT NULL DEFAULT 14,
  deep_rag_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
