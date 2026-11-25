import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { actorOf, sessionPrincipal } from "@aihot/backend/admin/auth";
import { sql } from "@aihot/backend/db";
import { InsightReportBodySchema, AttentionWeightSchema, TaxonomyLevelSchema } from "../types.ts";
import { listPendingL3Proposals, listTaxonomyNodes, reviewL3Proposal, upsertTaxonomyNode } from "./taxonomy.ts";
import { publishReportDraft } from "./reports.ts";

async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const admin = await sessionPrincipal(req.headers.cookie);
  if (!admin) {
    reply.code(401).send({ error: "unauthorized" });
    return null;
  }
  return admin;
}

export function registerTechInsightsHttp(app: FastifyInstance) {
  // Public / management read-only dashboard data (never calls LLMs on page load).
  app.get("/api/tech-insights/dashboard", async () => {
    const [taxonomy, clusters, latestReports] = await Promise.all([
      listTaxonomyNodes("active"),
      sql`SELECT id, pool, l3_id, title, summary, independent_source_count, momentum_score, window_days, created_at
          FROM tech_topic_clusters
          ORDER BY momentum_score DESC, created_at DESC
          LIMIT 30`,
      sql`SELECT id, period_kind, period_start, period_end, title, published_at
          FROM tech_insight_reports
          WHERE status = 'published'
          ORDER BY published_at DESC
          LIMIT 6`,
    ]);
    return { taxonomy, clusters, latestReports };
  });

  app.get("/api/tech-insights/reports/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const [report] = await sql`
      SELECT id, period_kind, period_start, period_end, title, status, body_json, published_at
      FROM tech_insight_reports
      WHERE id = ${id} AND status = 'published'`;
    if (!report) return reply.code(404).send({ error: "not_found" });
    return { report };
  });

  // Admin: 3-layer taxonomy & L3 dynamic growth proposals.
  app.get("/api/admin/tech-insights/taxonomy", async (req, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const [nodes, proposals] = await Promise.all([
      listTaxonomyNodes("all"),
      listPendingL3Proposals(),
    ]);
    return { nodes, proposals };
  });

  app.post("/api/admin/tech-insights/taxonomy", async (req, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const node = await upsertTaxonomyNode({
      id: typeof body.id === "string" ? body.id : undefined,
      parentId: typeof body.parentId === "string" ? body.parentId : null,
      level: TaxonomyLevelSchema.parse(Number(body.level)),
      name: String(body.name ?? "").trim(),
      definition: String(body.definition ?? "").trim(),
      includeExamples: Array.isArray(body.includeExamples) ? body.includeExamples.map(String) : [],
      excludeBoundaries: Array.isArray(body.excludeBoundaries) ? body.excludeBoundaries.map(String) : [],
      attentionWeight: AttentionWeightSchema.parse(body.attentionWeight ?? "watch"),
    });
    return { node };
  });

  app.post("/api/admin/tech-insights/proposals/:id/review", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const id = (req.params as { id: string }).id;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const action = body.action === "approve" || body.action === "merge" || body.action === "reject" ? body.action : null;
    if (!action) return reply.code(400).send({ error: "invalid_action" });
    return reviewL3Proposal({
      proposalId: id,
      action,
      parentL2Id: typeof body.parentL2Id === "string" ? body.parentL2Id : undefined,
      name: typeof body.name === "string" ? body.name : undefined,
      definition: typeof body.definition === "string" ? body.definition : undefined,
      attentionWeight: body.attentionWeight ? AttentionWeightSchema.parse(body.attentionWeight) : undefined,
      reviewNote: typeof body.reviewNote === "string" ? body.reviewNote : undefined,
      actor: actorOf(admin),
    });
  });

  // Admin: weekly/biweekly report draft review & one-click publish.
  app.get("/api/admin/tech-insights/reports", async (req, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const reports = await sql`
      SELECT id, period_kind, period_start, period_end, title, status, published_at, reviewed_by, updated_at
      FROM tech_insight_reports
      ORDER BY created_at DESC
      LIMIT 30`;
    return { reports };
  });

  app.post("/api/admin/tech-insights/reports/:id/publish", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const id = (req.params as { id: string }).id;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const report = await publishReportDraft(id, actorOf(admin), {
      title: typeof body.title === "string" ? body.title : undefined,
      body: body.body ? InsightReportBodySchema.parse(body.body) : undefined,
    });
    return { report };
  });
}
