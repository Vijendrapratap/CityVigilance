export const ARMS = ["N", "E", "S", "W"] as const;
export type Arm = (typeof ARMS)[number];

export const ARM_NAME: Record<Arm, string> = {
  N: "North",
  E: "East",
  S: "South",
  W: "West",
};

/** Vehicles arriving each second. The north approach is the heavy one. */
export const DEMAND: Record<Arm, number> = { N: 0.55, E: 0.18, S: 0.32, W: 0.12 };
export const DISCHARGE = 0.9;

const GREEN = 15;
const LOST = 3;

export type SimMode = "fixed" | "ai";

export type SimFrame = {
  t: number;
  queues: Record<Arm, number>;
  green: Arm | null;
  departed: number;
};

export type SimSummary = {
  meanQueue: number;
  peakQueue: number;
  departed: number;
};

function snapshot(queues: Record<Arm, number>): Record<Arm, number> {
  return { N: queues.N, E: queues.E, S: queues.S, W: queues.W };
}

function longest(queues: Record<Arm, number>): Arm {
  return [...ARMS].sort((a, b) => queues[b] - queues[a] || ARMS.indexOf(a) - ARMS.indexOf(b))[0] ?? "N";
}

export function buildTimeline(mode: SimMode, seconds = 180): SimFrame[] {
  const queues: Record<Arm, number> = { N: 0, E: 0, S: 0, W: 0 };
  const frames: SimFrame[] = [];
  let departed = 0;
  let left = 0;
  let green: Arm | null = null;
  for (let t = 0; t < seconds; t += 1) {
    if (mode === "fixed") {
      const cycle = GREEN + LOST;
      const arm = ARMS[Math.floor(t / cycle) % ARMS.length] ?? "N";
      green = t % cycle < GREEN ? arm : null;
    } else if (left <= 0) {
      green = longest(queues);
      left = Math.max(8, Math.min(24, Math.floor(8 + queues[green] * 1.1 + 0.5)));
    }
    for (const arm of ARMS) {
      const leave = arm === green ? DISCHARGE : 0;
      const served = Math.min(queues[arm] + DEMAND[arm], leave);
      queues[arm] = queues[arm] + DEMAND[arm] - served;
      departed += served;
    }
    if (mode === "ai") left -= 1;
    frames.push({ t, queues: snapshot(queues), green, departed });
  }
  return frames;
}

export function summarize(frames: SimFrame[]): SimSummary {
  let acc = 0;
  let peak = 0;
  for (const frame of frames) {
    const total = ARMS.reduce((sum, arm) => sum + frame.queues[arm], 0);
    acc += total;
    peak = Math.max(peak, total);
  }
  const last = frames[frames.length - 1];
  return {
    meanQueue: frames.length ? acc / frames.length : 0,
    peakQueue: peak,
    departed: last?.departed ?? 0,
  };
}

export function queueTotal(frame: SimFrame): number {
  return ARMS.reduce((sum, arm) => sum + frame.queues[arm], 0);
}
