export default function AdminTechTaxonomyPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">技术方向树（L1/L2/L3）与新 L3 提案审批</h1>
      <p className="text-sm opacity-75">
        TODO(company-integration)：对接 `/api/admin/tech-insights/taxonomy` 与 `/api/admin/tech-insights/proposals/:id/review`，维护节点定义、包含/排除边界、关注权重，并审批待观察池聚类产出的新 L3 提案。
      </p>
    </section>
  );
}
