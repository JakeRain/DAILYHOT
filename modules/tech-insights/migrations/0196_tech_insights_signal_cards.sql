CREATE TABLE IF NOT EXISTS tech_signal_cards (
  id text PRIMARY KEY,
  article_id text NOT NULL UNIQUE,
  l3_ids text[] NOT NULL DEFAULT '{}'::text[],
  observation_pool boolean NOT NULL DEFAULT false,
  problem text NOT NULL,
  approach text NOT NULL,
  delta text NOT NULL,
  maturity text NOT NULL CHECK (maturity IN ('paper', 'prototype', 'oss_adoption', 'production')),
  evidence text,
  value_score smallint NOT NULL CHECK (value_score BETWEEN 0 AND 100),
  woken_from_weak_pool boolean NOT NULL DEFAULT false,
  deep_rag_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
