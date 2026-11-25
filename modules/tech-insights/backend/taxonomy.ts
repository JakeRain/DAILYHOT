import { randomUUID } from "node:crypto";
import { sql } from "@aihot/backend/db";
import type { AttentionWeight, L3Proposal, TaxonomyLevel, TaxonomyNode, TaxonomyStatus } from "../types.ts";

interface TaxonomyRow {
  id: string;
  parent_id: string | null;
  level: number;
  name: string;
  definition: string;
  include_examples: string[];
  exclude_boundaries: string[];
  attention_weight: AttentionWeight;
  status: TaxonomyStatus;
  created_at: Date;
  updated_at: Date;
}

function toNode(row: TaxonomyRow): TaxonomyNode {
  return {
    id: row.id,
    parentId: row.parent_id,
    level: row.level as TaxonomyLevel,
    name: row.name,
    definition: row.definition,
    includeExamples: row.include_examples,
    excludeBoundaries: row.exclude_boundaries,
    attentionWeight: row.attention_weight,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listTaxonomyNodes(status: TaxonomyStatus | "all" = "active"): Promise<TaxonomyNode[]> {
  const rows = status === "all"
    ? await sql<TaxonomyRow[]>`SELECT * FROM tech_taxonomy_nodes ORDER BY level ASC, name ASC`
    : await sql<TaxonomyRow[]>`SELECT * FROM tech_taxonomy_nodes WHERE status = ${status} ORDER BY level ASC, name ASC`;
  return rows.map(toNode);
}

export async function upsertTaxonomyNode(input: {
  id?: string;
  parentId: string | null;
  level: TaxonomyLevel;
  name: string;
  definition: string;
  includeExamples: string[];
  excludeBoundaries: string[];
  attentionWeight: AttentionWeight;
  status?: TaxonomyStatus;
}): Promise<TaxonomyNode> {
  const id = input.id ?? `tax_${randomUUID().slice(0, 8)}`;
  const status = input.status ?? "active";
  const [row] = await sql<TaxonomyRow[]>`
    INSERT INTO tech_taxonomy_nodes (id, parent_id, level, name, definition, include_examples, exclude_boundaries, attention_weight, status)
    VALUES (${id}, ${input.parentId}, ${input.level}, ${input.name}, ${input.definition},
            ${input.includeExamples}, ${input.excludeBoundaries}, ${input.attentionWeight}, ${status})
    ON CONFLICT (id) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = EXCLUDED.level,
      name = EXCLUDED.name,
      definition = EXCLUDED.definition,
      include_examples = EXCLUDED.include_examples,
      exclude_boundaries = EXCLUDED.exclude_boundaries,
      attention_weight = EXCLUDED.attention_weight,
      status = EXCLUDED.status,
      updated_at = now()
    RETURNING *`;
  return toNode(row!);
}

export async function listPendingL3Proposals(): Promise<L3Proposal[]> {
  const rows = await sql<{
    id: string;
    cluster_id: string;
    suggested_parent_l2_id: string | null;
    proposed_name: string;
    proposed_definition: string;
    supporting_signal_ids: string[];
    status: L3Proposal["status"];
    review_note: string | null;
    created_at: Date;
  }[]>`SELECT * FROM tech_l3_proposals WHERE status = 'pending' ORDER BY created_at DESC`;

  return rows.map((r) => ({
    id: r.id,
    clusterId: r.cluster_id,
    suggestedParentL2Id: r.suggested_parent_l2_id,
    proposedName: r.proposed_name,
    proposedDefinition: r.proposed_definition,
    supportingSignalIds: r.supporting_signal_ids,
    status: r.status,
    reviewNote: r.review_note,
    createdAt: r.created_at.toISOString(),
  }));
}

/**
 * Human-in-the-loop governance: approve an auto-discovered L3 proposal and promote it into
 * the active 3-layer taxonomy tree, or merge/reject it.
 */
export async function reviewL3Proposal(input: {
  proposalId: string;
  action: "approve" | "merge" | "reject";
  parentL2Id?: string;
  name?: string;
  definition?: string;
  attentionWeight?: AttentionWeight;
  reviewNote?: string;
  actor: string;
}): Promise<{ proposalId: string; createdNodeId?: string }> {
  const [proposal] = await sql<{
    id: string;
    suggested_parent_l2_id: string | null;
    proposed_name: string;
    proposed_definition: string;
  }[]>`SELECT id, suggested_parent_l2_id, proposed_name, proposed_definition FROM tech_l3_proposals WHERE id = ${input.proposalId}`;
  if (!proposal) throw Object.assign(new Error("L3 proposal not found"), { statusCode: 404 });

  if (input.action === "approve") {
    const parentId = input.parentL2Id ?? proposal.suggested_parent_l2_id;
    if (!parentId) throw Object.assign(new Error("parentL2Id is required to approve an L3 proposal"), { statusCode: 400 });
    const node = await upsertTaxonomyNode({
      parentId,
      level: 3,
      name: input.name ?? proposal.proposed_name,
      definition: input.definition ?? proposal.proposed_definition,
      includeExamples: [],
      excludeBoundaries: [],
      attentionWeight: input.attentionWeight ?? "watch",
      status: "active",
    });
    await sql`
      UPDATE tech_l3_proposals
      SET status = 'approved', review_note = ${input.reviewNote ?? null}, reviewed_by = ${input.actor}, updated_at = now()
      WHERE id = ${input.proposalId}`;
    return { proposalId: input.proposalId, createdNodeId: node.id };
  }

  const nextStatus = input.action === "merge" ? "merged" : "rejected";
  await sql`
    UPDATE tech_l3_proposals
    SET status = ${nextStatus}, review_note = ${input.reviewNote ?? null}, reviewed_by = ${input.actor}, updated_at = now()
    WHERE id = ${input.proposalId}`;
  return { proposalId: input.proposalId };
}
