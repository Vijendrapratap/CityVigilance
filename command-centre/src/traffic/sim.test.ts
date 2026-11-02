import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTimeline, summarize } from "./sim.ts";

test("an AI plan holds a smaller queue than equal rotation when the north approach is heavy", () => {
  const fixed = buildTimeline("fixed", 180);
  const ai = buildTimeline("ai", 180);
  const fixedSummary = summarize(fixed);
  const aiSummary = summarize(ai);
  assert.ok(aiSummary.meanQueue < fixedSummary.meanQueue);
  assert.ok(aiSummary.peakQueue < fixedSummary.peakQueue);
  assert.ok(aiSummary.departed > fixedSummary.departed);
  const fixedNorth = fixed[fixed.length - 1]?.queues.N ?? 0;
  const aiNorth = ai[ai.length - 1]?.queues.N ?? 0;
  assert.ok(aiNorth < fixedNorth);
});
