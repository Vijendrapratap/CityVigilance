import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyDesk, ensureIncidents, reduceDesk } from "./desk.ts";
import { incidentSpecs, mergeLocal, publishFrames, runModels } from "./sample.ts";

const at = "2026-11-01T02:30:00.000Z";

function eventsAt(sequence: number) {
  return runModels(publishFrames(sequence, at)).events;
}

test("one stream tick fans out to six sample models and skips unconfigured api models", () => {
  const { events, skipped } = runModels(publishFrames(0, at));
  const models = events.map((event) => event.model).sort();
  assert.deepEqual(models, ["accident", "crowd", "movement", "plate", "traffic", "weapon"]);
  assert.equal(skipped.length, 0);
  assert.equal(events.every((event) => event.source === "sample"), true);
});

test("crowd count changes with the stream tick and a blade stays one incident with the count", () => {
  const first = eventsAt(0).find((event) => event.model === "crowd");
  const second = eventsAt(1).find((event) => event.model === "crowd");
  assert.equal(first?.finding.type === "crowd" && first.finding.count, 46);
  assert.equal(second?.finding.type === "crowd" && second.finding.count, 48);
  const specs = incidentSpecs(eventsAt(0));
  const crowdSpecs = specs.filter((spec) => spec.kind === "crowd");
  assert.equal(crowdSpecs.length, 1);
  assert.equal(specs.some((spec) => spec.kind === "accident"), true);
  assert.equal(specs.some((spec) => spec.kind === "traffic"), true);
});

test("a low count without a weapon shape does not open a crowd incident", () => {
  const specs = incidentSpecs([
    {
      id: "crowd-low",
      cameraId: "cam-crowd",
      model: "crowd",
      at,
      sequence: 0,
      source: "sample",
      strength: "high",
      finding: { type: "crowd", count: 12 },
    },
    {
      id: "weapon-none",
      cameraId: "cam-crowd",
      model: "weapon",
      at,
      sequence: 0,
      source: "sample",
      strength: "review",
      finding: { type: "weapon", kind: "none" },
    },
  ]);
  assert.equal(specs.some((spec) => spec.kind === "crowd"), false);
});

test("police deploy is screen-only, once, and only on a crowd incident", () => {
  const specs = incidentSpecs(eventsAt(0));
  const crowd = specs.find((spec) => spec.kind === "crowd");
  const accident = specs.find((spec) => spec.kind === "accident");
  assert.ok(crowd && accident);
  let state = ensureIncidents(emptyDesk(), specs, at);
  state = reduceDesk(state, {
    type: "deploy-police",
    incidentId: accident.id,
    detail: "Should not apply",
    note: "",
    at,
  });
  assert.equal(state.orders.length, 0);
  state = reduceDesk(state, {
    type: "deploy-police",
    incidentId: crowd.id,
    detail: "48 people · Possible blade",
    note: "Clip shows a blade shape",
    at,
  });
  assert.equal(state.incidents[crowd.id]?.status, "deployed");
  assert.equal(state.orders[0]?.adapter, "screen");
  assert.equal(state.orders[0]?.detail, "48 people · Possible blade");
  const again = reduceDesk(state, {
    type: "deploy-ambulance",
    incidentId: crowd.id,
    detail: "No",
    note: "",
    at: "2026-11-01T02:31:00.000Z",
  });
  assert.equal(again, state);
});

test("ambulance order and stored signal plan are separate", () => {
  const specs = incidentSpecs(eventsAt(2));
  let state = ensureIncidents(emptyDesk(), specs, at);
  const accident = specs.find((spec) => spec.kind === "accident");
  const traffic = specs.find((spec) => spec.kind === "traffic");
  assert.ok(accident && traffic);
  state = reduceDesk(state, {
    type: "deploy-ambulance",
    incidentId: accident.id,
    detail: "Crash on Road camera 1",
    note: "",
    at,
  });
  state = reduceDesk(state, {
    type: "accept-signal",
    incidentId: traffic.id,
    detail: "North 35s",
    note: "",
    at: "2026-11-01T02:32:00.000Z",
  });
  assert.equal(state.incidents[accident.id]?.status, "deployed");
  assert.equal(state.incidents[traffic.id]?.status, "accepted");
  assert.equal(state.orders.length, 2);
});

test("dismiss Other requires a note", () => {
  const specs = incidentSpecs(eventsAt(0));
  const accident = specs.find((spec) => spec.kind === "accident");
  assert.ok(accident);
  const state = ensureIncidents(emptyDesk(), specs, at);
  assert.equal(
    reduceDesk(state, { type: "dismiss", incidentId: accident.id, reason: "Other", note: " ", at }),
    state,
  );
  const next = reduceDesk(state, {
    type: "dismiss",
    incidentId: accident.id,
    reason: "Other",
    note: "Parked cars, not a crash",
    at,
  });
  assert.equal(next.incidents[accident.id]?.status, "dismissed");
});

test("an uploaded clip replaces the sample on that camera only", () => {
  const sample = eventsAt(0);
  const local = {
    id: "cam-crowd:crowd:clip",
    cameraId: "cam-crowd",
    model: "crowd" as const,
    at,
    sequence: 0,
    source: "local" as const,
    strength: "high" as const,
    finding: { type: "crowd" as const, count: 7 },
  };
  const merged = mergeLocal(sample, [local]);
  assert.equal(merged.some((event) => event.cameraId === "cam-crowd" && event.source === "sample"), false);
  const crowd = merged.find((event) => event.model === "crowd");
  assert.equal(crowd?.finding.type === "crowd" && crowd.finding.count, 7);
  assert.equal(merged.some((event) => event.model === "accident" && event.source === "sample"), true);
  const specs = incidentSpecs(merged);
  assert.equal(specs.some((spec) => spec.kind === "crowd"), false);
});

test("a listed demo plate opens its own incident and the flag stays on screen", () => {
  const specs = incidentSpecs(eventsAt(0));
  const plate = specs.find((spec) => spec.kind === "plate");
  assert.ok(plate);
  assert.equal(plate.id, "inc-plate-cam-junction");
  let state = ensureIncidents(emptyDesk(), specs, at);
  state = reduceDesk(state, {
    type: "flag-plate",
    incidentId: plate.id,
    detail: "DL01CV0001",
    note: "",
    at,
  });
  assert.equal(state.incidents[plate.id]?.status, "accepted");
  assert.equal(state.orders[0]?.action, "flag-plate");
  assert.equal(state.orders[0]?.adapter, "screen");
  const blocked = reduceDesk(state, {
    type: "flag-plate",
    incidentId: specs.find((spec) => spec.kind === "traffic")!.id,
    detail: "DL01CV0001",
    note: "",
    at,
  });
  assert.equal(blocked.orders.length, 1);
});

test("an open incident drops when the reading no longer supports it, and a recorded order stays", () => {
  const specs = incidentSpecs(eventsAt(0));
  const crowd = specs.find((spec) => spec.kind === "crowd");
  const accident = specs.find((spec) => spec.kind === "accident");
  assert.ok(crowd && accident);
  let state = ensureIncidents(emptyDesk(), specs, at);
  state = reduceDesk(state, {
    type: "deploy-police",
    incidentId: crowd.id,
    detail: "46 people",
    note: "",
    at,
  });
  const withoutCrowd = specs.filter((spec) => spec.id !== crowd.id);
  state = reduceDesk(state, { type: "sync", specs: withoutCrowd, at });
  assert.equal(state.incidents[crowd.id]?.status, "deployed");
  assert.equal(state.orders.length, 1);
  let fresh = ensureIncidents(emptyDesk(), specs, at);
  fresh = reduceDesk(fresh, { type: "sync", specs: [accident], at });
  assert.equal(fresh.incidents[crowd.id], undefined);
  assert.equal(fresh.incidents[accident.id]?.status, "open");
});

test("sudden movement opens the crowd incident even below the people threshold", () => {
  const specs = incidentSpecs([
    {
      id: "move",
      cameraId: "cam-crowd",
      model: "movement",
      at,
      sequence: 0,
      source: "local",
      strength: "review",
      finding: { type: "movement", level: "sudden", people: 12 },
    },
  ]);
  assert.equal(specs.some((spec) => spec.kind === "crowd"), true);
});

test("three vehicles in frame open a traffic incident without pretending to measure metres", () => {
  const specs = incidentSpecs([
    {
      id: "cam-junction:traffic:clip",
      cameraId: "cam-junction",
      model: "traffic",
      at,
      sequence: 0,
      source: "local",
      strength: "high",
      finding: {
        type: "traffic",
        basis: "vehicles",
        arms: [{ name: "In view", queueMetres: 0, vehicles: 3, currentGreenSeconds: 20, greenSeconds: 10 }],
      },
    },
  ]);
  assert.equal(specs.some((spec) => spec.kind === "traffic"), true);
});
