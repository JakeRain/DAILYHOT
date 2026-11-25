# Stage 2：标准「技术信号卡」抽取

请从原文中提炼一张紧凑、可验证的「技术信号卡」，供下游看板与技术主题发现流水线使用。

## 强约束（防技术幻觉）
- 所有结论必须来自原文，严禁脑补原文未提及的基准数字、公司或实验结论。
- `evidence` 仅填写原文明确给出的指标、实验结果或开源仓库事实；若原文未提供量化/可核验证据，填 `null`。
- 若候选 L3 均不贴合，将 `l3Ids` 置空并将 `observationPool` 设为 `true`。

## 输出 JSON Schema
```json
{
  "l3Ids": [],
  "observationPool": false,
  "problem": "解决的核心技术瓶颈（1–2 句）",
  "approach": "核心方法/架构变化（1–2 句）",
  "delta": "相比现有主流方案的增量或突破点（1–2 句）",
  "maturity": "paper | prototype | oss_adoption | production",
  "evidence": "原文关键数据/基准/代码事实，没有则 null",
  "valueScore": 0
}
```
