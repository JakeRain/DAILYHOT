import { randomUUID } from "node:crypto";
import { sql } from "@aihot/backend/db";
import type {
  AttentionWeight,
  L3Proposal,
  LifecycleGcDecision,
  LifecycleStatus,
  TaxonomyLevel,
  TaxonomyNode,
} from "../types.ts";

interface TaxonomyRow {
  id: string;
  parent_id: string | null;
  level: number;
  name: string;
  name_en: string;
  definition: string;
  include_examples: string[];
  exclude_boundaries: string[];
  engineering_focus: string;
  frontier_focus: string;
  clues: string[];
  attention_weight: AttentionWeight;
  lifecycle_status: LifecycleStatus;
  pinned: boolean;
  merged_into_id: string | null;
  last_hit_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toNode(row: TaxonomyRow): TaxonomyNode {
  return {
    id: row.id,
    parentId: row.parent_id,
    level: row.level as TaxonomyLevel,
    name: row.name,
    nameEn: row.name_en ?? "",
    definition: row.definition,
    includeExamples: row.include_examples,
    excludeBoundaries: row.exclude_boundaries,
    engineeringFocus: row.engineering_focus ?? "",
    frontierFocus: row.frontier_focus ?? "",
    clues: row.clues ?? [],
    attentionWeight: row.attention_weight,
    lifecycleStatus: (row.lifecycle_status ?? "active") as LifecycleStatus,
    pinned: Boolean(row.pinned),
    mergedIntoId: row.merged_into_id ?? null,
    lastHitAt: row.last_hit_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface LifecyclePolicy {
  /** Days an `incubating` L3 has to prove sustained signal before graduating or sleeping. */
  incubatingTrialDays: number;
  /** Minimum high-value hits during trial to graduate to `active`. */
  incubatingMinHits: number;
  /** Days of silence before an unpinned `active` L3 automatically moves to `dormant`. */
  activeSilentDaysToDormant: number;
  /** Soft cap of active L3 nodes per L2 branch to prevent unbounded sprawl. */
  maxActiveL3PerL2: number;
}

export const DEFAULT_LIFECYCLE_POLICY: LifecyclePolicy = {
  incubatingTrialDays: 45,
  incubatingMinHits: 3,
  activeSilentDaysToDormant: 75,
  maxActiveL3PerL2: 8,
};

/**
 * Pure lifecycle GC decision function for L3 topics:
 * - Never touches L1/L2 (governed by humans) or `pinned` strategic L3 topics.
 * - Graduates `incubating` topics with sustained hits -> `active`; puts silent ones -> `dormant`.
 * - Automatically cools down unpinned `active` topics with prolonged silence -> `dormant` (soft delete from recall).
 */
export function evaluateLifecycleTransition(input: {
  level: TaxonomyLevel;
  lifecycleStatus: LifecycleStatus;
  pinned: boolean;
  daysSinceCreated: number;
  daysSinceLastHit: number;
  recentHighValueHits: number;
}, policy: LifecyclePolicy = DEFAULT_LIFECYCLE_POLICY): LifecycleStatus | null {
  if (input.level !== 3) return null;
  if (input.lifecycleStatus === "retired") return null;

  if (input.lifecycleStatus === "incubating") {
    if (input.recentHighValueHits >= policy.incubatingMinHits) return "active";
    if (!input.pinned && input.daysSinceCreated >= policy.incubatingTrialDays) return "dormant";
    return null;
  }

  if (input.lifecycleStatus === "active") {
    if (!input.pinned && input.daysSinceLastHit >= policy.activeSilentDaysToDormant) return "dormant";
    return null;
  }

  if (input.lifecycleStatus === "dormant" && input.recentHighValueHits >= 2) {
    return "incubating";
  }

  return null;
}

export async function listTaxonomyNodes(filter: LifecycleStatus | "all" = "active"): Promise<TaxonomyNode[]> {
  const rows = filter === "all"
    ? await sql<TaxonomyRow[]>`SELECT * FROM tech_taxonomy_nodes ORDER BY level ASC, id ASC`
    : await sql<TaxonomyRow[]>`SELECT * FROM tech_taxonomy_nodes WHERE lifecycle_status = ${filter} ORDER BY level ASC, id ASC`;
  return rows.map(toNode);
}

export async function upsertTaxonomyNode(input: {
  id?: string;
  parentId: string | null;
  level: TaxonomyLevel;
  name: string;
  nameEn?: string;
  definition: string;
  includeExamples: string[];
  excludeBoundaries: string[];
  engineeringFocus?: string;
  frontierFocus?: string;
  clues?: string[];
  attentionWeight: AttentionWeight;
  lifecycleStatus?: LifecycleStatus;
  pinned?: boolean;
}): Promise<TaxonomyNode> {
  const id = input.id ?? `tax_${randomUUID().slice(0, 8)}`;
  const lifecycle = input.lifecycleStatus ?? "active";
  const legacyStatus = lifecycle === "retired" || lifecycle === "dormant" ? "archived" : lifecycle === "proposed" ? "proposed" : "active";
  const [row] = await sql<TaxonomyRow[]>`
    INSERT INTO tech_taxonomy_nodes (
      id, parent_id, level, name, name_en, definition,
      include_examples, exclude_boundaries, engineering_focus, frontier_focus, clues,
      attention_weight, status, lifecycle_status, pinned
    )
    VALUES (
      ${id}, ${input.parentId}, ${input.level}, ${input.name}, ${input.nameEn ?? ""}, ${input.definition},
      ${input.includeExamples}, ${input.excludeBoundaries}, ${input.engineeringFocus ?? ""}, ${input.frontierFocus ?? ""}, ${input.clues ?? []},
      ${input.attentionWeight}, ${legacyStatus}, ${lifecycle}, ${Boolean(input.pinned)}
    )
    ON CONFLICT (id) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = EXCLUDED.level,
      name = EXCLUDED.name,
      name_en = EXCLUDED.name_en,
      definition = EXCLUDED.definition,
      include_examples = EXCLUDED.include_examples,
      exclude_boundaries = EXCLUDED.exclude_boundaries,
      engineering_focus = EXCLUDED.engineering_focus,
      frontier_focus = EXCLUDED.frontier_focus,
      clues = EXCLUDED.clues,
      attention_weight = EXCLUDED.attention_weight,
      status = EXCLUDED.status,
      lifecycle_status = EXCLUDED.lifecycle_status,
      pinned = EXCLUDED.pinned,
      updated_at = now()
    RETURNING *`;
  return toNode(row!);
}

/**
 * Periodic Lifecycle GC: cools down silent unpinned L3s to `dormant`, graduates proven `incubating` L3s to `active`.
 */
export async function runLifecycleGc(now = new Date()): Promise<LifecycleGcDecision[]> {
  const nodes = await listTaxonomyNodes("all");
  const decisions: LifecycleGcDecision[] = [];

  for (const node of nodes) {
    if (node.level !== 3 || node.lifecycleStatus === "retired") continue;
    const daysSinceCreated = (now.getTime() - new Date(node.createdAt).getTime()) / 86_400_000;
    const lastRef = node.lastHitAt ? new Date(node.lastHitAt).getTime() : new Date(node.createdAt).getTime();
    const daysSinceLastHit = (now.getTime() - lastRef) / 86_400_000;

    const [{ hits }] = await sql<{ hits: number }[]>`
      SELECT count(*)::int AS hits
      FROM tech_signal_cards
      WHERE ${node.id} = ANY(l3_ids)
        AND created_at >= now() - interval '45 days'
        AND (engineering_score >= 70 OR frontier_score >= 75)`;

    const next = evaluateLifecycleTransition({
      level: node.level,
      lifecycleStatus: node.lifecycleStatus,
      pinned: node.pinned,
      daysSinceCreated,
      daysSinceLastHit,
      recentHighValueHits: hits ?? 0,
    });
    if (!next) continue;

    const legacyStatus = next === "dormant" ? "archived" : "active";
    await sql`
      UPDATE tech_taxonomy_nodes
      SET lifecycle_status = ${next}, status = ${legacyStatus}, updated_at = now()
      WHERE id = ${node.id}`;
    decisions.push({
      nodeId: node.id,
      from: node.lifecycleStatus,
      to: next,
      reason: next === "dormant" ? `silent ${Math.round(daysSinceLastHit)}d` : `sustained ${hits} high-value hits`,
    });
  }

  return decisions;
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
 * Human-in-the-loop governance: newly approved L3 proposals enter `incubating` first
 * (30-60d trial) before graduating to `active`.
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
      attentionWeight: input.attentionWeight ?? "core",
      lifecycleStatus: "incubating",
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
