ALTER TABLE tech_signal_cards ADD COLUMN IF NOT EXISTS topic_evidences_json jsonb NOT NULL DEFAULT '[]'::jsonb;
