ALTER TABLE tech_taxonomy_nodes ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
