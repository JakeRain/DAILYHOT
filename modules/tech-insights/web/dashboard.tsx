import { useState } from "react";
import { Link } from "react-router";
import { TECHHOT_DEMO } from "../demo-data.ts";
import type { AttentionWeight, QuadrantTag } from "../types.ts";

const RING_LABELS: Record<AttentionWeight, { label: string; cls: string }> = {
  core: { label: "Core 核心深入", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  focus: { label: "Focus 重点支撑", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  watch: { label: "Watch 探索雷达", cls: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30" },
};

const QUADRANT_LABELS: Record<QuadrantTag, { label: string; cls: string }> = {
  tech_hot_rival_active: { label: "主战场 · 技术热 + 友商动", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  tech_hot_rival_quiet: { label: "早期拐点 · 技术热 + 友商静", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  rival_hype_low_tech: { label: "警惕跟风 · 友商热 + 技术平", cls: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300" },
  weak_signal_wakeup: { label: "弱信号共振唤醒", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
};

const LIFECYCLE_BADGE: Record<string, string> = {
  active: "活跃",
  incubating: "孵化试用",
  dormant: "自动休眠",
  proposed: "待审批",
  retired: "已退役",
};

export default function TechInsightsDashboardPage() {
  const { taxonomy, signalCards, clusters, proposals, reports } = TECHHOT_DEMO;
  const [ringFilter, setRingFilter] = useState<AttentionWeight | "all">("all");
  const [selectedL1, setSelectedL1] = useState<string>("all");

  const l1Nodes = taxonomy.filter((n) => n.level === 1 && (ringFilter === "all" || n.attentionWeight === ringFilter));
  const visibleNodes = taxonomy.filter((n) => {
    if (ringFilter !== "all" && n.attentionWeight !== ringFilter) return false;
    if (selectedL1 === "all") return n.level === 3 || (n.level === 1 && n.attentionWeight === "watch");
    return n.id === selectedL1 || n.id.startsWith(`${selectedL1}.`);
  });

  const activeL3Count = taxonomy.filter((n) => n.level === 3 && (n.lifecycleStatus === "active" || n.lifecycleStatus === "incubating")).length;
  const latestReport = reports[0];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              TechHOT · 交互 Demo
            </span>
            <span className="text-xs opacity-60">ColorOS 软硬协同 · 情报 × 洞察联动</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">技术洞察 · 三层方向看板</h1>
          <p className="mt-1 text-sm opacity-75">
            面向技术管理层：左边看三层方向树与生命周期状态，右边看「工程落地 vs 前沿启发」双方向信号卡与友商情报佐证。
          </p>
        </div>
        {latestReport && (
          <Link
            to={`/tech-insights/reports/${latestReport.id}`}
            className="rounded-lg border border-black/15 dark:border-white/15 px-4 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            阅读本期《技术洞察周报》 →
          </Link>
        )}
      </header>

      {/* Top KPI summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-xs opacity-60">活跃/孵化 L3 主题</div>
          <div className="mt-1 text-2xl font-bold">{activeL3Count}</div>
          <div className="mt-1 text-xs opacity-60">外围探索区先落到 L2</div>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-xs opacity-60">本期高价值信号卡</div>
          <div className="mt-1 text-2xl font-bold">{signalCards.length}</div>
          <div className="mt-1 text-xs opacity-60">工程 / 前沿双分制不抵消</div>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-xs opacity-60">弱信号共振唤醒</div>
          <div className="mt-1 text-2xl font-bold">{signalCards.filter((c) => c.wokenFromWeakPool).length}</div>
          <div className="mt-1 text-xs opacity-60">多源共振防漏早期突破</div>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-xs opacity-60">待审批新 L3 提案</div>
          <div className="mt-1 text-2xl font-bold">{proposals.filter((p) => p.status === "pending").length}</div>
          <div className="mt-1 text-xs opacity-60">
            <Link to="/admin/tech-insights/taxonomy" className="underline">去后台治理 →</Link>
          </div>
        </div>
      </section>

      {/* Tech x Competitor Intelligence Clusters */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">近期重点趋势簇（技术洞察 × 友商情报联动）</h2>
          <span className="text-xs opacity-60">按 14–30 天动量与独立信源数排序</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {clusters.map((cluster) => {
            const quad = cluster.quadrant ? QUADRANT_LABELS[cluster.quadrant] : null;
            return (
              <article key={cluster.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {quad && <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${quad.cls}`}>{quad.label}</span>}
                  <span className="text-xs opacity-60">
                    {cluster.independentSourceCount} 个独立信源 · 动量 {cluster.momentumScore}
                  </span>
                </div>
                <h3 className="font-semibold leading-snug">{cluster.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{cluster.summary}</p>
                {cluster.relatedIntel && cluster.relatedIntel.length > 0 && (
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] p-2.5 text-xs space-y-1">
                    <div className="font-medium opacity-70">新闻轨 · 友商情报佐证：</div>
                    {cluster.relatedIntel.map((intel) => (
                      <div key={intel.storyId} className="flex items-baseline gap-1.5 opacity-85">
                        <span className="font-semibold shrink-0">[{intel.company}]</span>
                        <span>{intel.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* 3-Layer Taxonomy Interactive Explorer */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">三层技术方向树（含生命周期与三圈权重）</h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(["all", "core", "focus", "watch"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRingFilter(r); setSelectedL1("all"); }}
                className={`rounded-full border px-3 py-1 transition ${ringFilter === r ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-black/15 dark:border-white/15 opacity-75 hover:opacity-100"}`}
              >
                {r === "all" ? "全部圈层" : RING_LABELS[r].label}
              </button>
            ))}
          </div>
        </div>

        {/* L1 Domain pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedL1("all")}
            className={`rounded-lg border px-3 py-1.5 ${selectedL1 === "all" ? "border-emerald-500 font-semibold" : "border-black/10 dark:border-white/10 opacity-75"}`}
          >
            全部重点方向
          </button>
          {l1Nodes.map((l1) => (
            <button
              key={l1.id}
              type="button"
              onClick={() => setSelectedL1(l1.id)}
              className={`rounded-lg border px-3 py-1.5 ${selectedL1 === l1.id ? "border-emerald-500 font-semibold" : "border-black/10 dark:border-white/10 opacity-75"}`}
            >
              {l1.id} {l1.name}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {visibleNodes.map((node) => (
            <div key={node.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono font-semibold opacity-70">
                  L{node.level} · {node.id}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded border px-1.5 py-0.5 ${RING_LABELS[node.attentionWeight].cls}`}>
                    {node.attentionWeight}
                  </span>
                  <span className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5">
                    {LIFECYCLE_BADGE[node.lifecycleStatus] ?? node.lifecycleStatus}
                  </span>
                  {node.pinned && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">📌 锁死</span>}
                </div>
              </div>
              <div className="font-semibold">{node.name}</div>
              <p className="text-xs opacity-75 leading-relaxed">{node.definition}</p>
              {node.engineeringFocus && (
                <div className="text-xs opacity-70">
                  <span className="font-medium">工程方向：</span>{node.engineeringFocus}
                </div>
              )}
              {node.frontierFocus && (
                <div className="text-xs opacity-70">
                  <span className="font-medium">前沿方向：</span>{node.frontierFocus}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Dual-Direction Signal Cards */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">标准技术信号卡（工程落地 vs 前沿启发 · 分开打分）</h2>
        <div className="space-y-3">
          {signalCards.map((card) => (
            <article key={card.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono opacity-60">{card.id}</span>
                  <span className="rounded bg-black/5 dark:bg-white/10 px-2 py-0.5">{card.maturity}</span>
                  {card.wokenFromWeakPool && (
                    <span className="rounded bg-violet-500/15 px-2 py-0.5 text-violet-700 dark:text-violet-300">弱信号唤醒</span>
                  )}
                  {card.l3Ids.length ? card.l3Ids.map((id) => (
                    <span key={id} className="rounded border border-black/10 dark:border-white/15 px-1.5 py-0.5 font-mono">{id}</span>
                  )) : (
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300">开放候选池</span>
                  )}
                </div>
                <div className="flex items-center gap-3 font-medium">
                  <span className="text-emerald-700 dark:text-emerald-300">工程落地 {card.engineeringScore}</span>
                  <span className="text-sky-700 dark:text-sky-300">前沿启发 {card.frontierScore}</span>
                </div>
              </div>
              <h3 className="font-semibold">{card.title ?? card.articleId}</h3>
              <div className="grid gap-2 text-xs sm:grid-cols-3 opacity-85">
                <div><span className="font-semibold">问题：</span>{card.problem}</div>
                <div><span className="font-semibold">方法：</span>{card.approach}</div>
                <div><span className="font-semibold">增量：</span>{card.delta}</div>
              </div>
              {card.evidence && (
                <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-xs">
                  <span className="font-semibold opacity-75">原文证据：</span>
                  <span className="opacity-85">{card.evidence}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
