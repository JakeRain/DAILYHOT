import assert from "node:assert/strict";
import { test } from "node:test";
import { decideStage1Route } from "../backend/funnel.ts";
import { validateReportCitations } from "../backend/reports.ts";
import { evaluateLifecycleTransition } from "../backend/taxonomy.ts";
import { TECHHOT_DEMO } from "../demo-data.ts";

test("Stage 1 decoupled routing honors V1.0 6-state triage and never penalizes off-tree breakthroughs", () => {
  assert.equal(
    decideStage1Route({ isNoise: false, triageState: "OPEN_TOPIC_CANDIDATE", treeRelevance: 10, techNovelty: 80, isCoreSource: false }),
    "signal_card",
  );
  assert.equal(
    decideStage1Route({ isNoise: false, triageState: "INSUFFICIENT_MATERIAL", treeRelevance: 0, techNovelty: 0, isCoreSource: false }),
    "weak_signal",
  );
  assert.equal(
    decideStage1Route({ isNoise: false, triageState: "VALID_EMPTY", treeRelevance: 90, techNovelty: 90, isCoreSource: true }),
    "drop",
  );
  assert.equal(
    decideStage1Route({ isNoise: false, treeRelevance: 15, techNovelty: 30, isCoreSource: true }),
    "weak_signal",
  );
});

test("L3 5-state lifecycle GC graduates proven topics, cools silent ones, and respects pinned lock", () => {
  // Incubating with sustained hits -> active
  assert.equal(
    evaluateLifecycleTransition({ level: 3, lifecycleStatus: "incubating", pinned: false, daysSinceCreated: 20, daysSinceLastHit: 2, recentHighValueHits: 3 }),
    "active",
  );
  // Incubating trial expired with 0 hits -> dormant
  assert.equal(
    evaluateLifecycleTransition({ level: 3, lifecycleStatus: "incubating", pinned: false, daysSinceCreated: 50, daysSinceLastHit: 50, recentHighValueHits: 0 }),
    "dormant",
  );
  // Active unpinned silent >= 75d -> dormant (auto soft-delete from recall)
  assert.equal(
    evaluateLifecycleTransition({ level: 3, lifecycleStatus: "active", pinned: false, daysSinceCreated: 120, daysSinceLastHit: 80, recentHighValueHits: 0 }),
    "dormant",
  );
  // Active PINNED silent >= 75d -> stays active
  assert.equal(
    evaluateLifecycleTransition({ level: 3, lifecycleStatus: "active", pinned: true, daysSinceCreated: 120, daysSinceLastHit: 100, recentHighValueHits: 0 }),
    null,
  );
  // Dormant topic suddenly getting new hits -> wakes back to incubating
  assert.equal(
    evaluateLifecycleTransition({ level: 3, lifecycleStatus: "dormant", pinned: false, daysSinceCreated: 200, daysSinceLastHit: 1, recentHighValueHits: 2 }),
    "incubating",
  );
  // L1/L2 never auto-transitioned
  assert.equal(
    evaluateLifecycleTransition({ level: 2, lifecycleStatus: "active", pinned: false, daysSinceCreated: 300, daysSinceLastHit: 200, recentHighValueHits: 0 }),
    null,
  );
});

test("Demo report passes strict anti-hallucination citation validation and blocks fake IDs", () => {
  const validIds = new Set(TECHHOT_DEMO.signalCards.map((c) => c.id!));
  const demoCheck = validateReportCitations(TECHHOT_DEMO.reports[0]!.body, validIds);
  assert.equal(demoCheck.valid, true);

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
