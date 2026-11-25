export default function TechInsightsDashboardPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">技术洞察 · 三层方向看板</h1>
      <p className="mt-2 text-sm opacity-75">
        面向技术管理层的轻量看板骨架：按 L1 战略大方向 / L2 细分技术域 / L3 具体技术点展示近期升温信号、多源共振突破预警与已发布的《技术洞察周/双周报》。
      </p>
      <section className="mt-6 rounded-lg border p-4 text-sm">
        <p className="font-medium">TODO(company-integration)：接入 `/api/tech-insights/dashboard`</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 opacity-80">
          <li>按三层方向树渲染目录与关注权重（core / focus / watch）</li>
          <li>展示各方向 14–30 天技术信号簇与关联新闻佐证</li>
          <li>置顶最新一期已发布的《技术洞察周/双周报》入口</li>
        </ul>
      </section>
    </main>
  );
}
