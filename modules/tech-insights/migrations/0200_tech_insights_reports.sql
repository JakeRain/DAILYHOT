CREATE TABLE IF NOT EXISTS tech_insight_reports (
  id text PRIMARY KEY,
  period_kind text NOT NULL CHECK (period_kind IN ('weekly', 'biweekly')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  body_json jsonb NOT NULL,
  published_at timestamptz,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
