import type { Camera, Frame, IncidentSpec, ModelEvent, ModelId, ModelMode, TrafficArm } from "./types";

export const CAMERAS: Camera[] = [
  { id: "cam-crowd", name: "Crowd camera 1", kind: "crowd", x: 200, y: 168 },
  { id: "cam-junction", name: "Junction camera 1", kind: "junction", x: 600, y: 168 },
  { id: "cam-road", name: "Road camera 1", kind: "road", x: 400, y: 400 },
];

/** Demo plugs. API and local slots exist; no vendor is configured. */
export const MODEL_MODES: Record<ModelId, ModelMode> = {
  crowd: "sample",
  weapon: "sample",
  accident: "sample",
  traffic: "sample",
};

const COUNTS = [46, 48, 51, 49, 53, 50, 47, 52];

const QUEUE_SETS: number[][] = [
  [62, 22, 34, 14],
  [58, 24, 30, 16],
  [70, 20, 36, 15],
  [66, 26, 28, 18],
];

const ARM_NAMES = ["North", "East", "South", "West"] as const;
const CURRENT_GREENS = [20, 20, 25, 15];

export function cameraById(id: string): Camera | undefined {
  return CAMERAS.find((camera) => camera.id === id);
}

export function publishFrames(sequence: number, at: string): Frame[] {
  return CAMERAS.map((camera) => ({
    cameraId: camera.id,
    at,
    sequence,
    source: "sample" as const,
  }));
}

export function runModels(frames: Frame[]): { events: ModelEvent[]; skipped: string[] } {
  const events: ModelEvent[] = [];
  const skipped: string[] = [];
  for (const frame of frames) {
    for (const model of Object.keys(MODEL_MODES) as ModelId[]) {
      const mode = MODEL_MODES[model];
      if (mode === "off") continue;
      if (mode === "api" || mode === "local") {
        skipped.push(`${model} has no ${mode} model configured`);
        continue;
      }
      const event = sampleEvent(model, frame);
      if (event) events.push(event);
    }
  }
  return { events, skipped };
}

export function sampleEvent(model: ModelId, frame: Frame): ModelEvent | null {
  if (model === "crowd" && frame.cameraId === "cam-crowd") {
    const count = COUNTS[frame.sequence % COUNTS.length] ?? 46;
    return event(frame, "crowd", "high", { type: "crowd", count });
  }
  if (model === "weapon" && frame.cameraId === "cam-crowd") {
    const count = COUNTS[frame.sequence % COUNTS.length] ?? 46;
    return event(frame, "weapon", "review", {
      type: "weapon",
      kind: count >= 40 ? "blade" : "none",
    });
  }
  if (model === "accident" && frame.cameraId === "cam-road") {
    return event(frame, "accident", "review", { type: "accident", crash: true });
  }
  if (model === "traffic" && frame.cameraId === "cam-junction") {
    const queues = QUEUE_SETS[frame.sequence % QUEUE_SETS.length] ?? QUEUE_SETS[0];
    const arms: TrafficArm[] = ARM_NAMES.map((name, index) => {
      const queueMetres = queues?.[index] ?? 0;
      return {
        name,
        queueMetres,
        currentGreenSeconds: CURRENT_GREENS[index] ?? 20,
        greenSeconds: suggestedGreen(queueMetres),
      };
    });
    return event(frame, "traffic", "high", { type: "traffic", arms });
  }
  return null;
}

export function incidentSpecs(events: ModelEvent[]): IncidentSpec[] {
  const specs: IncidentSpec[] = [];
  for (const camera of CAMERAS) {
    const mine = events.filter((item) => item.cameraId === camera.id);
    const crowd = finding(mine, "crowd");
    const weapon = finding(mine, "weapon");
    if (
      (crowd?.type === "crowd" && crowd.count >= 40) ||
      (weapon?.type === "weapon" && weapon.kind !== "none")
    ) {
      specs.push({ id: `inc-crowd-${camera.id}`, cameraId: camera.id, kind: "crowd" });
    }
    const accident = finding(mine, "accident");
    if (accident?.type === "accident" && accident.crash) {
      specs.push({ id: `inc-accident-${camera.id}`, cameraId: camera.id, kind: "accident" });
    }
    const traffic = finding(mine, "traffic");
    if (traffic?.type === "traffic" && traffic.arms.some((arm) => arm.greenSeconds !== arm.currentGreenSeconds)) {
      specs.push({ id: `inc-traffic-${camera.id}`, cameraId: camera.id, kind: "traffic" });
    }
  }
  return specs;
}

export function displayId(incidentId: string): string {
  if (incidentId.startsWith("inc-crowd")) return "CR-1";
  if (incidentId.startsWith("inc-accident")) return "RD-1";
  return "JN-1";
}

export function weaponLabel(kind: "firearm" | "blade" | "none"): string {
  if (kind === "firearm") return "Possible firearm";
  if (kind === "blade") return "Possible blade";
  return "No weapon shape";
}

function suggestedGreen(queueMetres: number): number {
  return Math.max(10, Math.min(60, Math.round(queueMetres / 2)));
}

function event(
  frame: Frame,
  model: ModelId,
  strength: ModelEvent["strength"],
  finding: ModelEvent["finding"],
): ModelEvent {
  return {
    id: `${frame.cameraId}:${model}:${frame.sequence}`,
    cameraId: frame.cameraId,
    model,
    at: frame.at,
    sequence: frame.sequence,
    source: "sample",
    strength,
    finding,
  };
}

function finding(events: ModelEvent[], type: ModelEvent["finding"]["type"]): ModelEvent["finding"] | undefined {
  return events.find((item) => item.finding.type === type)?.finding;
}
