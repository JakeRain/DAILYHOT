CREATE TABLE IF NOT EXISTS tech_l3_proposals (
  id text PRIMARY KEY,
  cluster_id text NOT NULL REFERENCES tech_topic_clusters(id),
  suggested_parent_l2_id text REFERENCES tech_taxonomy_nodes(id),
  proposed_name text NOT NULL,
  proposed_definition text NOT NULL DEFAULT '',
  supporting_signal_ids text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'merged', 'rejected')),
  review_note text,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
