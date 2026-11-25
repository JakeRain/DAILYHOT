# `TechHOT` — `@aihot/tech-insights` 技术洞察模块（骨架 + 交互 Demo）

面向 **OPPO 手机系统（ColorOS）架构部门（软硬件兼顾 · 向上服务）** 的双轨情报与技术洞察模块：
- **新闻栏目（情报轨）**：复用原生事件归组与热度，盯友商动向（Apple / 华为 / 小米 / vivo / 荣耀 / 高通 / 联发科）与市场热点。
- **技术栏目（洞察轨）**：基于本模块运行三层方向树、2+1 漏斗、弱信号唤醒与周期性洞察周报，并在看板与周报层与新闻轨友商情报联动互证。

## 核心机制（已内置交互 Demo + 单元测试）

1. **三层方向树 + 三圈权重 + 5 态生命周期（`backend/taxonomy.ts`）**：
   - 在 V1.0 档案（`D01`–`D07`）基础上补齐 **`D08 移动终端操作系统与端侧硬件架构`**；
   - **核心深入区（`core`）启用精锐 L3，外围支撑/探索区（`focus` / `watch`）先落到 L2、按需长 L3**；
   - **5 态生命周期**：`proposed` → `incubating`（30–60 天试用）→ `active` ↔ `dormant`（长期无命中自动休眠退出召回，支持 `pinned` 战略锁）→ `retired`（合并/退役，保留 `merged_into_id`，ID 永不复用）。
2. **V1.0 6 态分诊 + 双方向评价（`backend/funnel.ts`）**：
   - 6 态：`MATCHED` / `MULTI_MATCHED` / `LANDSCAPE_ONLY` / `OPEN_TOPIC_CANDIDATE` / `INSUFFICIENT_MATERIAL` / `VALID_EMPTY`；
   - 双方向评价：**`engineeringScore`（工程落地价值）与 `frontierScore`（前沿启发价值）分开打分、绝不合并抵消**；多主题关联必须分别存证（`topicEvidences`）。
3. **开箱即看交互 Demo（`demo-data.ts` + `web/*.tsx`）**：
   - 当数据库 `tech_*` 表为空时，`/api/tech-insights/dashboard` 与前端 4 个页面自动展示完整的 ColorOS 软硬协同 Demo 数据：
     - `/tech-insights`：三层方向看板 + 「技术 × 友商」四象限趋势簇 + 双分制信号卡
     - `/tech-insights/reports/rep_demo_w47`：可点击核验 `[sig_xxx]` 证据链的周报 Demo
     - `/admin/tech-insights/taxonomy`：三层方向树、5 态生命周期控制、`pinned` 锁与新 L3 提案审批
     - `/admin/tech-insights/reports`：周报草稿 15 分钟把关与发布台

## 给明天公司 AI 的对接清单（搜索 `TODO(company-integration)`）

1. **`backend/funnel.ts`**：将现有 6 阶段代码拆分接入 `runStage1Anchor`（两级召回 Top 8–12 主题 + 6 态分诊）、`runStage2SignalCard`（双方向评分 + 独立存证）、`runStage3DeepRag`（按需历史对照）。
2. **`backend/discovery.ts`**：接入现有主题发现流水线与弱信号多源共振唤醒（`tech_weak_signals` → 补做 Stage 2 信号卡）。
3. **`backend/reports.ts`**：接入周/双周报草稿模型生成与原生 `stories` 友商新闻按 L1/L2 关联查询，复用内置 `validateReportCitations` 强证据校验器。
4. **种子导入**：将整理好的 V1.0 + D08 主题地图导入 `tech_taxonomy_nodes` 后，API 与前端自动切换为真实库数据。
