import { randomUUID } from "node:crypto";
import { sql } from "@aihot/backend/db";
import { InsightReportBodySchema, type InsightReport, type InsightReportBody } from "../types.ts";

export interface CitationValidationResult {
  valid: boolean;
  missingSignalIds: string[];
  uncitedClaimCount: number;
}

/**
 * Hard anti-hallucination guard for management reports:
 * Every claim in executiveSummary, sections, and emergingSignals MUST cite at least one
 * existing `tech_signal_cards.id` from the allowed set.
 */
export function validateReportCitations(body: InsightReportBody, validSignalIds: ReadonlySet<string>): CitationValidationResult {
  const missing = new Set<string>();
  let uncitedClaimCount = 0;

  const claims = [
    ...body.executiveSummary,
    ...body.sections.flatMap((s) => s.claims),
    ...body.emergingSignals,
  ];

  for (const claim of claims) {
    if (!claim.signalIds.length) {
      uncitedClaimCount += 1;
      continue;
    }
    for (const id of claim.signalIds) {
      if (!validSignalIds.has(id)) missing.add(id);
    }
  }

  return {
    valid: uncitedClaimCount === 0 && missing.size === 0,
    missingSignalIds: [...missing],
    uncitedClaimCount,
  };
}

/**
 * Generates a weekly/biweekly Tech Insight Report DRAFT for human 10–15 min review before publishing.
 *
 * TODO(company-integration):
 * 1. Load top `tech_topic_clusters` (with Stage 3 `deep_rag_json`) and `tech_signal_cards` in `[periodStart, periodEnd]`.
 * 2. Query native news track (`stories` / `publication/`) mapped to the same L1/L2 directions as market/competitor corroboration.
 * 3. Call `techReportDraft` model step with `prompts/report-draft.md`.
 * 4. Validate output with `InsightReportBodySchema` and `validateReportCitations` before saving draft.
 */
export async function generateReportDraft(input: {
  periodKind: "weekly" | "biweekly";
  periodStart: string;
  periodEnd: string;
}): Promise<InsightReport> {
  const id = `rep_${randomUUID().slice(0, 10)}`;
  const title = input.periodKind === "weekly"
    ? `技术洞察周报（${input.periodStart.slice(0, 10)} ~ ${input.periodEnd.slice(0, 10)}）`
    : `技术洞察双周报（${input.periodStart.slice(0, 10)} ~ ${input.periodEnd.slice(0, 10)}）`;

  const body: InsightReportBody = InsightReportBodySchema.parse({
    executiveSummary: [],
    sections: [],
    emergingSignals: [],
  });

  const [row] = await sql<{
    id: string;
    period_kind: "weekly" | "biweekly";
    period_start: Date;
    period_end: Date;
    title: string;
    status: "draft" | "published" | "archived";
    body_json: InsightReportBody;
    published_at: Date | null;
    reviewed_by: string | null;
    created_at: Date;
    updated_at: Date;
  }[]>`
    INSERT INTO tech_insight_reports (id, period_kind, period_start, period_end, title, status, body_json)
    VALUES (${id}, ${input.periodKind}, ${new Date(input.periodStart)}, ${new Date(input.periodEnd)},
            ${title}, 'draft', ${sql.json(body as unknown as Record<string, never>)})
    RETURNING *`;

  return {
    id: row!.id,
    periodKind: row!.period_kind,
    periodStart: row!.period_start.toISOString(),
    periodEnd: row!.period_end.toISOString(),
    title: row!.title,
    status: row!.status,
    body: row!.body_json,
    publishedAt: row!.published_at?.toISOString() ?? null,
    reviewedBy: row!.reviewed_by,
    createdAt: row!.created_at.toISOString(),
    updatedAt: row!.updated_at.toISOString(),
  };
}

export async function publishReportDraft(reportId: string, actor: string, patch?: { title?: string; body?: InsightReportBody }): Promise<InsightReport> {
  const [existing] = await sql<{ title: string; body_json: InsightReportBody }[]>`
    SELECT title, body_json FROM tech_insight_reports WHERE id = ${reportId}`;
  if (!existing) throw Object.assign(new Error("Report draft not found"), { statusCode: 404 });

  const nextBody = patch?.body ? InsightReportBodySchema.parse(patch.body) : existing.body_json;
  const nextTitle = patch?.title ?? existing.title;

  const [row] = await sql<{
    id: string;
    period_kind: "weekly" | "biweekly";
    period_start: Date;
    period_end: Date;
    title: string;
    status: "draft" | "published" | "archived";
    body_json: InsightReportBody;
    published_at: Date | null;
    reviewed_by: string | null;
    created_at: Date;
    updated_at: Date;
  }[]>`
    UPDATE tech_insight_reports
    SET title = ${nextTitle},
        body_json = ${sql.json(nextBody as unknown as Record<string, never>)},
        status = 'published',
        published_at = coalesce(published_at, now()),
        reviewed_by = ${actor},
        updated_at = now()
    WHERE id = ${reportId}
    RETURNING *`;

  return {
    id: row!.id,
    periodKind: row!.period_kind,
    periodStart: row!.period_start.toISOString(),
    periodEnd: row!.period_end.toISOString(),
    title: row!.title,
    status: row!.status,
    body: row!.body_json,
    publishedAt: row!.published_at?.toISOString() ?? null,
    reviewedBy: row!.reviewed_by,
    createdAt: row!.created_at.toISOString(),
    updatedAt: row!.updated_at.toISOString(),
  };
}
