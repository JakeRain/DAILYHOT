import assert from "node:assert/strict";
import { test } from "node:test";
import { decideStage1Route } from "../backend/funnel.ts";
import { validateReportCitations } from "../backend/reports.ts";

test("Stage 1 decoupled routing never penalizes high-novelty off-tree breakthroughs", () => {
  // Off-tree (treeRelevance = 10) but high novelty (80) -> straight to signal_card (observation pool)
  assert.equal(
    decideStage1Route({ isNoise: false, treeRelevance: 10, techNovelty: 80, isCoreSource: false }),
    "signal_card",
  );
  // Moderate novelty (50) -> low-cost weak_signal pool for multi-source wakeup
  assert.equal(
    decideStage1Route({ isNoise: false, treeRelevance: 20, techNovelty: 50, isCoreSource: false }),
    "weak_signal",
  );
  // Core source (T1 paper/lab) with modest initial score -> still kept in weak_signal pool
  assert.equal(
    decideStage1Route({ isNoise: false, treeRelevance: 15, techNovelty: 30, isCoreSource: true }),
    "weak_signal",
  );
  // Explicit noise always drops
  assert.equal(
    decideStage1Route({ isNoise: true, treeRelevance: 90, techNovelty: 90, isCoreSource: true }),
    "drop",
  );
});

test("Report citation validator blocks hallucinated or missing signal IDs", () => {
  const validIds = new Set(["sig_a", "sig_b"]);
  const ok = validateReportCitations(
    {
      executiveSummary: [{ text: "方向 A 明显升温", signalIds: ["sig_a"], relatedStoryIds: [] }],
      sections: [{ l1Id: "tax_1", heading: "基础设施", summary: "概览", claims: [{ text: "推理成本下降", signalIds: ["sig_b"], relatedStoryIds: [101] }] }],
      emergingSignals: [],
    },
    validIds,
  );
  assert.equal(ok.valid, true);

  const bad = validateReportCitations(
    {
      executiveSummary: [{ text: "编造的突破结论", signalIds: ["sig_fake"], relatedStoryIds: [] }],
      sections: [],
      emergingSignals: [],
    },
    validIds,
  );
  assert.equal(bad.valid, false);
  assert.deepEqual(bad.missingSignalIds, ["sig_fake"]);
});
