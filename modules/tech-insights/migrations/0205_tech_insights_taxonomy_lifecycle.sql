ALTER TABLE tech_taxonomy_nodes ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active';
