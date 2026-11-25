ALTER TABLE tech_taxonomy_nodes ADD COLUMN IF NOT EXISTS clues text[] NOT NULL DEFAULT '{}'::text[];
