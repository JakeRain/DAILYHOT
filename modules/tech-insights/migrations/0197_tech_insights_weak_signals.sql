CREATE TABLE IF NOT EXISTS tech_weak_signals (
  article_id text PRIMARY KEY,
  source_id text NOT NULL,
  published_at timestamptz NOT NULL,
  embedding_json jsonb,
  woken_at timestamptz,
  cluster_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
