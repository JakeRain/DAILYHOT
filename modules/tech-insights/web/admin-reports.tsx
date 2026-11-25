import { useState } from "react";
import { Link } from "react-router";
import { TECHHOT_DEMO } from "../demo-data.ts";
import type { InsightReport } from "../types.ts";

export default function AdminTechReportsPage() {
  const [reports, setReports] = useState<InsightReport[]>(TECHHOT_DEMO.reports);
  const [notice, setNotice] = useState<string | null>(null);

  const togglePublish = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === "published" ? "draft" : "published", reviewedBy: "架构部编辑" } : r)),
    );
    setNotice(`已更新报告 ${id} 发布状态（Demo 本地交互）`);
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">TechHOT · 技术洞察周报草稿把关与发布</h1>
        <p className="text-xs opacity-70">
          自动草稿经强引用校验（所有论断必须绑定真实 signal_id），人工 10–15 分钟微调后一键发布给技术管理层。
        </p>
      </header>

      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      <div className="space-y-3">
        {reports.map((rep) => (
          <div key={rep.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono opacity-60">{rep.id}</span>
                <span className={`rounded px-2 py-0.5 font-medium ${rep.status === "published" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                  {rep.status === "published" ? "已发布" : "待审草稿"}
                </span>
              </div>
              <div className="font-semibold text-sm">{rep.title}</div>
              <div className="text-xs opacity-65">
                核心结论 {rep.body.executiveSummary.length} 条 · 分方向 {rep.body.sections.length} 组 · 弱信号预警 {rep.body.emergingSignals.length} 条
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Link
                to={`/tech-insights/reports/${rep.id}`}
                className="rounded-md border border-black/15 dark:border-white/15 px-3 py-1.5 hover:bg-black/5"
              >
                预览报告
              </Link>
              <button
                type="button"
                onClick={() => togglePublish(rep.id)}
                className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
              >
                {rep.status === "published" ? "撤回为草稿" : "一键发布"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
