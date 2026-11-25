# Stage 2：标准「技术信号卡」与双方向价值评价（TechHOT）

请从原文中提炼一张紧凑、可核验的「技术信号卡」。

## 强制防幻觉纪律
1. **双方向评价分开打分、绝不合并抵消**：
   - `engineeringScore`（0–100，工程落地价值）：是否解决真实系统的性能、功耗、温控、内存、成本、可靠性或运维问题？需要实际实现、架构、测量或对照实验证据。
   - `frontierScore`（0–100，前沿启发价值）：是否提出新机制、新硬件/软件架构、新问题定义或值得中长期追踪的拐点可能性？
2. **多主题独立存证**：`topicEvidences` 中每个命中的 `topicId` 必须附带独立的原文机制证据摘录；不能因为共享术语多归属。
3. **无原文依据填 `null`**：严禁脑补基准数字、公司或实验结论；若无匹配主题则 `l3Ids` 置空并将 `observationPool` 设为 `true`。

## 输出 JSON Schema
```json
{
  "l3Ids": [],
  "topicEvidences": [{ "topicId": "D08.02.001", "evidenceQuote": "原文依据" }],
  "observationPool": false,
  "problem": "解决的核心技术瓶颈（1–2 句）",
  "approach": "核心方法/软硬架构变化（1–2 句）",
  "delta": "相比现有主流方案的增量或突破点（1–2 句）",
  "maturity": "paper | prototype | oss_adoption | production",
  "evidence": "原文关键实测数据/基准/代码事实，无则 null",
  "engineeringScore": 0,
  "frontierScore": 0
}
```
