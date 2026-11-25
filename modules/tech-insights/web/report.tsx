import { useState } from "react";
import { Link, useParams } from "react-router";
import { TECHHOT_DEMO } from "../demo-data.ts";

export default function TechInsightsReportPage() {
  const { id } = useParams();
  const report = TECHHOT_DEMO.reports.find((r) => r.id === id) ?? TECHHOT_DEMO.reports[0]!;
  const signalMap = new Map(TECHHOT_DEMO.signalCards.map((c) => [c.id, c]));
  const [activeSignalId, setActiveSignalId] = useState<string | null>(null);
  const activeSignal = activeSignalId ? signalMap.get(activeSignalId) : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between text-xs opacity-70">
        <Link to="/tech-insights" className="hover:underline">← 返回技术洞察看板</Link>
        <span>强证据引用校验通过 · 每条结论均绑定信号卡</span>
      </div>

      <header className="border-b border-black/10 dark:border-white/10 pb-5 space-y-2">
        <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {report.periodKind === "weekly" ? "TechHOT 周报" : "TechHOT 双周报"} · {report.periodStart.slice(0, 10)} ~ {report.periodEnd.slice(0, 10)}
        </div>
        <h1 className="text-2xl font-bold">{report.title}</h1>
        <p className="text-xs opacity-65">审阅发布：{report.reviewedBy ?? "待审阅"} · 点击任意 [sig_xxx] 标签可展开原文证据链</p>
      </header>

      {/* Executive Summary */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">一、本期核心判断与建议动作</h2>
        <div className="space-y-3">
          {report.body.executiveSummary.map((claim, idx) => (
            <div key={idx} className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-2">
              <p className="text-sm leading-relaxed">{claim.text}</p>
              {claim.actionHint && (
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  建议动作：{claim.actionHint}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {claim.signalIds.map((sid) => (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => setActiveSignalId(activeSignalId === sid ? null : sid)}
                    className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  >
                    [{sid}] 查看证据
                  </button>
                ))}
                {claim.relatedStoryIds.length > 0 && (
                  <span className="opacity-60">关联友商新闻事件：{claim.relatedStoryIds.map((s) => `#${s}`).join("、")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Evidence Inspector Drawer */}
      {activeSignal && (
        <aside className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.06] p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold">证据核验 · {activeSignal.id}（{activeSignal.sourceName}）</span>
            <button type="button" onClick={() => setActiveSignalId(null)} className="underline opacity-70">收起</button>
          </div>
          <div className="font-medium text-sm">{activeSignal.title}</div>
          <div><span className="font-semibold">工程落地 {activeSignal.engineeringScore} / 前沿启发 {activeSignal.frontierScore}</span> · 成熟度：{activeSignal.maturity}</div>
          <div><span className="font-semibold">原文实证：</span>{activeSignal.evidence ?? "无量化实证"}</div>
        </aside>
      )}

      {/* Sections */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">二、分方向技术演进详情</h2>
        {report.body.sections.map((sec, i) => (
          <div key={i} className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{sec.heading}</h3>
              {sec.l1Id && <span className="font-mono text-xs opacity-60">{sec.l1Id}</span>}
            </div>
            <p className="text-xs opacity-75">{sec.summary}</p>
            <ul className="space-y-2 text-sm">
              {sec.claims.map((c, j) => (
                <li key={j} className="flex flex-wrap items-baseline gap-2">
                  <span>• {c.text}</span>
                  {c.signalIds.map((sid) => (
                    <button
                      key={sid}
                      type="button"
                      onClick={() => setActiveSignalId(sid)}
                      className="rounded border border-black/15 dark:border-white/15 px-1.5 py-0.5 font-mono text-xs opacity-80 hover:opacity-100"
                    >
                      [{sid}]
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Emerging Signals */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">三、新兴弱信号与目录盲区预警</h2>
        {report.body.emergingSignals.map((item, idx) => (
          <div key={idx} className="rounded-xl border border-violet-500/30 bg-violet-500/[0.04] p-4 space-y-2">
            <p className="text-sm">{item.text}</p>
            {item.actionHint && <div className="text-xs text-violet-700 dark:text-violet-300">{item.actionHint}</div>}
          </div>
        ))}
      </section>
    </main>
  );
}
