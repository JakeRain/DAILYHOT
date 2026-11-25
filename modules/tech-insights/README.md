# `@aihot/tech-insights` — 技术洞察模块骨架

面向技术管理层的**技术洞察**独立模块，遵循 AIHOT 的 [`modules/`](../../docs/architecture.md#模块) 规范：复用框架的信源采集、正文清洗、回执（`providers/receipts.ts`）、预算熔断与 `pg-boss` 队列，不侵入引擎核心代码。

## 核心架构闭环

1. **双轨入口（`sourceUses: tech_insight`）**：论文、技术博客、技术公众号等信源在后台勾选 `tech_insight` 用途，共享采集与正文清洗，不重复抓取。
2. **三层技术方向树（`tech_taxonomy_nodes`）**：`L1 战略大方向（人工）→ L2 细分技术域（人工）→ L3 具体技术点（人工种子 + 后期提议生长）`。每个节点携带 `definition`、`include_examples`、`exclude_boundaries`、`attention_weight`，防止模型产生技术幻觉。
3. **单篇漏斗式 2+1 阶段（`backend/funnel.ts`）**：
   - **Stage 1（轻量锚定 + 解耦初评）**：把 `tree_relevance`（贴合三层树）与 `tech_novelty`（技术突破/新颖度）拆开打分（不在树内绝不扣分），路由至 `drop` / `weak_signal` / `signal_card`。
   - **Stage 2（标准技术信号卡）**：仅过阈值文章（及被唤醒的弱信号）产出紧凑 JSON 卡片（问题 / 方法 / 增量 / 成熟度 / 原文证据），按是否匹配现有 L3 进入已锚定池或「待观察池」。
   - **Stage 3（按需重 RAG 与历史对照）**：仅对极少数高突破单篇或进入周报的候选主题触发，对比同 L3 近 3–6 个月历史信号卡判断是否真正拐点。
4. **防漏召回 + 主题发现 + L3 动态生长（`backend/discovery.ts`）**：
   - **弱信号唤醒**：未达直选但来自核心信源或新颖度尚可的文章低成本进入 `tech_weak_signals`（仅存向量）；14–30 天内出现 ≥ 3 个独立信源语义共振成簇时，批量唤醒并补做信号卡。
   - **双路主题发现**：Pool A 聚合已锚定 L3 算升温/突破信号；Pool B 对「待观察池」高密度聚类生成 `tech_l3_proposals` 进后台人工审批。
5. **洞察层汇合 + 人工把关周报（`backend/reports.ts`）**：
   - 自动生成《技术洞察周/双周报》草稿，每条结论强制绑定 `[signal_id]` 证据链（校验器拦截无依据幻觉），并挂载同 L1/L2 的原生新闻事件作为产业/竞品佐证；后台人工花 10–15 分钟审阅后一键发布。

## 给公司 AI 的对接清单（搜索 `TODO(company-integration)`）

明天在公司环境整合现有代码时，按以下顺序逐项替换骨架里的占位实现即可：

1. **三层方向种子数据**：通过 `/api/admin/tech-insights/taxonomy` 或种子脚本录入公司当前的 L1/L2/L3 节点及包含/排除边界。
2. **`backend/funnel.ts`**：
   - `runStage1Anchor`：接入你现有的轻量模型 + 向量召回，读取 `prompts/stage1-anchor.md` 输出解耦分数与候选 L3。
   - `runStage2SignalCard`：将原 6 阶段中的「技术语义抽取」精简迁移至此，读取 `prompts/stage2-signal-card.md` 输出标准 `TechSignalCard`。
   - `runStage3DeepRag`：将原 6 阶段中的「RAG 检索 + 重排 + 历史对比」迁移至此，仅按需触发。
3. **`backend/discovery.ts`**：
   - `runWeakSignalWakeup`：接入你现有的向量聚类算法，对 `tech_weak_signals` 做 14–30 天窗口多源共振检测并调用 `enqueueOn(QUEUES.stage2SignalCard, ...)` 唤醒。
   - `runTopicDiscovery`：接入你现有的技术主题发现流水线，输出 `tech_topic_clusters` 与 `tech_l3_proposals`。
4. **`backend/reports.ts`**：
   - `generateReportDraft`：接入周报生成模型调用（读取 `prompts/report-draft.md`），复用已内置的 `validateReportCitations` 强证据校验器，并补充 L1/L2 到原生 `stories` 的映射查询。
5. **模型调用与回执**：所有大模型/Embedding 调用统一走 `@aihot/backend/providers/llm` 与 `providers/receipts.ts`，并在 `server.ts` 已声明的 `models` 步骤里管理切换与预算。
