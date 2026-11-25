import { useState } from "react";
import { TECHHOT_DEMO } from "../demo-data.ts";
import type { L3Proposal, LifecycleStatus, TaxonomyNode } from "../types.ts";

export default function AdminTechTaxonomyPage() {
  const [nodes, setNodes] = useState<TaxonomyNode[]>(TECHHOT_DEMO.taxonomy);
  const [proposals, setProposals] = useState<L3Proposal[]>(TECHHOT_DEMO.proposals);
  const [statusFilter, setStatusFilter] = useState<LifecycleStatus | "all">("all");
  const [notice, setNotice] = useState<string | null>(null);

  const togglePin = (id: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
    setNotice(`已切换节点 ${id} 的战略保护锁（Demo 本地状态，接入后端后写入 tech_taxonomy_nodes.pinned）`);
  };

  const setLifecycle = (id: string, next: LifecycleStatus) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, lifecycleStatus: next } : n)));
    setNotice(`节点 ${id} 生命周期已变更为 ${next}（ID 永不复用）`);
  };

  const handleProposal = (proposal: L3Proposal, action: "approve" | "reject") => {
    setProposals((prev) => prev.map((p) => (p.id === proposal.id ? { ...p, status: action === "approve" ? "approved" : "rejected" } : p)));
    if (action === "approve") {
      const newId = `${proposal.suggestedParentL2Id ?? "D02.03"}.NEW`;
      setNodes((prev) => [
        ...prev,
        {
          id: newId,
          parentId: proposal.suggestedParentL2Id,
          level: 3,
          name: proposal.proposedName,
          nameEn: "Incubating Topic",
          definition: proposal.proposedDefinition,
          includeExamples: [],
          excludeBoundaries: [],
          engineeringFocus: "孵化期观察",
          frontierFocus: "弱信号共振提拔",
          clues: [],
          attentionWeight: "core",
          lifecycleStatus: "incubating",
          pinned: false,
          mergedIntoId: null,
          lastHitAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      setNotice(`已批准提案「${proposal.proposedName}」进入 incubating（30–60 天孵化试用期）！`);
    } else {
      setNotice(`已拒绝提案「${proposal.proposedName}」`);
    }
  };

  const filtered = nodes.filter((n) => statusFilter === "all" || n.lifecycleStatus === statusFilter);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">TechHOT · 三层技术方向树与生命周期治理</h1>
        <p className="text-xs opacity-70">
          支持动态生长（新 L3 提案批准进 incubating）与动态退场（无 pinned 锁且长期无命中自动转 dormant，人工确认转 retired），防止方向树无限膨胀。
        </p>
      </header>

      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {/* Pending L3 Proposals */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">待审批的新 L3 萌芽提案（来自开放候选池 / 弱信号唤醒）</h2>
        {proposals.filter((p) => p.status === "pending").length === 0 ? (
          <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 text-xs opacity-60">当前没有待审批的新 L3 提案。</div>
        ) : (
          proposals.filter((p) => p.status === "pending").map((p) => (
            <div key={p.id} className="rounded-xl border border-violet-500/30 p-4 space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">{p.proposedName}</div>
                <span className="font-mono text-xs opacity-60">建议挂靠：{p.suggestedParentL2Id}</span>
              </div>
              <p className="text-xs opacity-80">{p.proposedDefinition}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleProposal(p, "approve")}
                  className="rounded-md bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-700"
                >
                  批准进入孵化期（incubating）
                </button>
                <button
                  type="button"
                  onClick={() => handleProposal(p, "reject")}
                  className="rounded-md border border-black/15 dark:border-white/15 px-3 py-1 hover:bg-black/5"
                >
                  忽略 / 拒绝
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Taxonomy Lifecycle Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">方向节点列表（共 {filtered.length} 个）</h2>
          <div className="flex flex-wrap gap-1 text-xs">
            {(["all", "active", "incubating", "dormant", "retired"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md border px-2.5 py-1 ${statusFilter === s ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-black/15 dark:border-white/15 opacity-75"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((n) => (
            <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 dark:border-white/10 px-3 py-2.5 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold opacity-65">L{n.level} {n.id}</span>
                  <span className="font-semibold text-sm">{n.name}</span>
                  <span className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5">{n.attentionWeight}</span>
                  <span className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5">{n.lifecycleStatus}</span>
                </div>
                <div className="opacity-70">{n.definition}</div>
              </div>
              {n.level === 3 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePin(n.id)}
                    className="rounded border border-black/15 dark:border-white/15 px-2 py-1 hover:bg-black/5"
                  >
                    {n.pinned ? "📌 已锁死" : "加保护锁"}
                  </button>
                  {n.lifecycleStatus !== "dormant" && (
                    <button
                      type="button"
                      onClick={() => setLifecycle(n.id, "dormant")}
                      className="rounded border border-black/15 dark:border-white/15 px-2 py-1 hover:bg-black/5"
                    >
                      休眠
                    </button>
                  )}
                  {n.lifecycleStatus === "dormant" && (
                    <button
                      type="button"
                      onClick={() => setLifecycle(n.id, "incubating")}
                      className="rounded border border-emerald-500/40 px-2 py-1 text-emerald-700 dark:text-emerald-300"
                    >
                      复苏
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
