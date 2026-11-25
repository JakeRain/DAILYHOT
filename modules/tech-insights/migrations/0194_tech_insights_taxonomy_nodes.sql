CREATE TABLE IF NOT EXISTS tech_taxonomy_nodes (
  id text PRIMARY KEY,
  parent_id text REFERENCES tech_taxonomy_nodes(id),
  level smallint NOT NULL CHECK (level IN (1, 2, 3)),
  name text NOT NULL,
  definition text NOT NULL DEFAULT '',
  include_examples text[] NOT NULL DEFAULT '{}'::text[],
  exclude_boundaries text[] NOT NULL DEFAULT '{}'::text[],
  attention_weight text NOT NULL DEFAULT 'watch' CHECK (attention_weight IN ('core', 'focus', 'watch')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'proposed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
