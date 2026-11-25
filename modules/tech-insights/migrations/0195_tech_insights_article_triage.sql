CREATE TABLE IF NOT EXISTS tech_article_triage (
  article_id text PRIMARY KEY,
  is_noise boolean NOT NULL DEFAULT false,
  tree_relevance smallint NOT NULL CHECK (tree_relevance BETWEEN 0 AND 100),
  tech_novelty smallint NOT NULL CHECK (tech_novelty BETWEEN 0 AND 100),
  candidate_l3_ids text[] NOT NULL DEFAULT '{}'::text[],
  rationale text NOT NULL DEFAULT '',
  decision text NOT NULL CHECK (decision IN ('drop', 'weak_signal', 'signal_card')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
