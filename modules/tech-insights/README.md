# `TechHOT` — `@aihot/tech-insights` 技术洞察模块

面向 **OPPO 手机系统（ColorOS）架构部门（软硬件兼顾 · 向上服务）** 的双轨情报与技术洞察模块：
- **新闻栏目（情报轨）**：复用原生事件归组与热度，盯友商动向（Apple / 华为 / 小米 / vivo / 荣耀 / 高通 / 联发科）与市场热点。
- **技术栏目（洞察轨）**：基于三层方向树与双方向评价（工程落地 vs 前沿启发）沉淀底层技术演进，并与新闻轨友商情报在看板/周报层联动互证。

---

## 一、短期目标（Phase 0 最小实验版 · 3–5 天跑通）

> **核心原则**：先把核心价值闭环跑通、产出第 1 期给架构部领导试读的真实《TechHOT 技术洞察周报》，再逐步打开完整骨架里的队列、聚类、弱信号唤醒与生命周期治理。

### 短期只做 3 件事（精准落地方式）

1. **精简方向树到 20 个核心 L3（先不碰 446 个大目录）**
   - 直接使用 [scripts/core-topics-v0.json](./scripts/core-topics-v0.json)（已围绕 **终端 OS 与端侧硬件 `D08`**、**AI OS 与系统级 Agent `D02`**、**端侧 AI 推理与内存能效 `D01`** 预置 20 个互斥核心 L3，含纳入/排除边界）。
   - 明天到公司后，先花 15 分钟按部门近期真实关注点微调这 20 个节点即可。

2. **单篇处理砍成「单步脚本」直接跑 100–200 篇真实文章**
   - 只有 20 个核心 L3 时，**暂不需要向量召回、重排或重 RAG**——直接把 20 个 L3 定义放进上下文，每篇文章只调 **1 次模型 API**，同时产出：
     - **6 态分流**（`MATCHED` / `MULTI_MATCHED` / `LANDSCAPE_ONLY` / `OPEN_TOPIC_CANDIDATE` / `INSUFFICIENT_MATERIAL` / `VALID_EMPTY`）
     - **双方向独立打分**（`engineeringScore` 工程落地分 vs `frontierScore` 前沿启发分，绝不合并抵消）
     - **1 张标准技术信号卡**（问题 / 方法 / 增量 / 成熟度 / 原文证据）
   - 直接运行已内置的实验脚本 [scripts/run-mvp.ts](./scripts/run-mvp.ts)：
     ```bash
     # 1) 先用 dry-run 检查输入与 Prompt 组装是否正常（不消耗 Token）
     node modules/tech-insights/scripts/run-mvp.ts --input .data/tech-sample.jsonl --dry-run

     # 2) 读取 .env 里的 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 跑 100-200 篇真文章
     node --env-file=.env modules/tech-insights/scripts/run-mvp.ts \
       --input .data/tech-sample.jsonl \
       --out .data/mvp-signals.jsonl \
       --summary .data/mvp-top-signals.md
     ```
   - 输入 `JSONL` 每行只需 4 个字段：`{"articleId":"...","title":"...","sourceName":"...","body":"..."}`。

3. **人工半自动拼出第 1 期真实周报给领导看反馈**
   - 从脚本输出的 `.data/mvp-top-signals.md` 中取高分信号卡（默认 `engineeringScore >= 75 || frontierScore >= 80`，通常 15–20 条）；
   - 人工从现有新闻栏目里挑 3–5 条本周友商动作（Apple / 华为 / 小米 / 高通等）贴在对应方向旁边；
   - 按 [prompts/report-draft.md](./prompts/report-draft.md) 生成第 1 期周报草稿，用 `validateReportCitations` 校验所有 `[sig_id]` 引用无幻觉，人工花 15 分钟微调后发给领导试读。

### 短期验收标准（Day 2–3 抽检 30 篇）
- **归类准确率**：30 篇抽检中，核心 L3 命中与 `OPEN_TOPIC_CANDIDATE` 判定基本合理，无明显硬塞；
- **零幻觉底线**：信号卡的 `evidence` 字段 100% 能在原文找到对应依据，无凭空捏造数字或公司；
- **管理层反馈**：领导能明确指出“哪些信号有用、哪些方向太泛/不需要”。

### 短期坚决先不做（等第 1 期周报验证有效后再按需开启）
- ❌ 446 个全量主题导入与两级向量召回
- ❌ 弱信号向量池与多源共振自动唤醒
- ❌ 主题自动聚类流水线与新 L3 提案后台审批
- ❌ 5 态生命周期自动休眠 GC（`proposed → incubating → active ↔ dormant → retired`）
- ❌ Stage 3 重 RAG 历史对照与新闻↔技术自动映射

---

## 二、长期演进路线（骨架已预留完毕，按阶段解锁）

等 Phase 0 实验跑通并拿到领导反馈后，直接沿用本模块已建好的代码与 19 条在线迁移（`0194`–`0212`）分阶段解锁：

1. **Phase 1（入库与线上化）**：将验证过的 20–50 个核心 L3 写入 `tech_taxonomy_nodes`，把 `run-mvp.ts` 的单步逻辑接进 `backend/funnel.ts` + `pg-boss` 队列，线上自动产出信号卡并点亮 `/tech-insights` 看板。
2. **Phase 2（周报半自动化与情报联动）**：启用 `backend/reports.ts` 每周自动出草稿 + 关联同 L1/L2 新闻事件（`stories`），在 `/admin/tech-insights/reports` 做 15 分钟人工把关发布。
3. **Phase 3（扩域防漏与生命周期治理）**：当目录扩大到 100+ 节点时，再开启两级召回、弱信号多源共振唤醒（`backend/discovery.ts`）、Stage 3 按需重 RAG 对照与 5 态生命周期自动休眠 GC（`backend/taxonomy.ts`）。

---

## 三、交互 Demo 入口（开箱可演示）

启动站点后，数据库 `tech_*` 表为空时会自动加载 [demo-data.ts](./demo-data.ts)（ColorOS 软硬协同示例数据）：
- `/tech-insights`：三层方向看板 + 「技术 × 友商」四象限趋势簇 + 双分制信号卡
- `/tech-insights/reports/rep_demo_w47`：可点击 `[sig_xxx]` 核验原文证据链的周报 Demo
- `/admin/tech-insights/taxonomy`：5 态生命周期、`pinned` 保护锁与新 L3 提案治理台
- `/admin/tech-insights/reports`：周报草稿审核与发布台
