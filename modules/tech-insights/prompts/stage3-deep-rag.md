# Stage 3：按需重 RAG 与历史对照（仅对突破候选/周报主题触发）

给定当前「技术信号卡 / 主题簇」以及同方向近 3–6 个月的历史技术信号卡，判断这是否构成真正的**技术拐点或实质性突破**，还是已有路线的常规微调。

## 回答要求
1. 明确指出相比历史信号卡的新增变化（`keyDifferences`），每条差异必须指向具体的对比信号 ID。
2. 面向技术管理层，避免堆砌论文公式，重点说明工程可行性、性能/成本边界变化与落地成熟度。

## 输出 JSON Schema
```json
{
  "isBreakthrough": false,
  "historicalContext": "该方向近 3–6 个月演进脉络简述",
  "keyDifferences": ["差异点 1", "差异点 2"],
  "comparedSignalIds": ["sig_xxx"]
}
```
