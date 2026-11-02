import { useEffect, useState } from "react";
import { ARM_NAME, buildTimeline, queueTotal, summarize, type Arm, type SimFrame } from "../traffic/sim";
import { Chrome } from "./Chrome";

const FIXED = buildTimeline("fixed", 180);
const AI = buildTimeline("ai", 180);
const FIXED_SUMMARY = summarize(FIXED);
const AI_SUMMARY = summarize(AI);

export function TrafficControl({ onHome }: { onHome: () => void }) {
  const [index, setIndex] = useState(70);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((value) => (value + 1) % FIXED.length);
    }, 80);
    return () => window.clearInterval(id);
  }, [playing]);

  const fixed = FIXED[index] ?? FIXED[0];
  const ai = AI[index] ?? AI[0];
  if (!fixed || !ai) return null;

  return (
    <section className="screen traffic-screen">
      <Chrome title="Traffic control" onHome={onHome}>
        <button type="button" className="text-btn" aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>
          {playing ? "Pause" : "Play"}
        </button>
      </Chrome>
      <div className="traffic-body">
        <p className="traffic-lead">
          One junction, three minutes, the same arrivals. North is the heavy approach. Rotation gives every arm the same green.
          The AI plan gives green to the longest queue. The plan stays on this screen.
        </p>
        <div className="compare">
          <Plan name="Rotation" kicker="Equal green" frame={fixed} summary={FIXED_SUMMARY} tone="rotation" />
          <Plan name="AI plan" kicker="Longest queue" frame={ai} summary={AI_SUMMARY} tone="ai" />
        </div>
        <Sparkline />
      </div>
    </section>
  );
}

function Plan({
  name,
  kicker,
  frame,
  summary,
  tone,
}: {
  name: string;
  kicker: string;
  frame: SimFrame;
  summary: { meanQueue: number; peakQueue: number; departed: number };
  tone: "rotation" | "ai";
}) {
  return (
    <article className="plan" data-tone={tone}>
      <header>
        <p className="eyebrow">{kicker}</p>
        <h2>{name}</h2>
      </header>
      <div className="junction" aria-hidden="true">
        <Arm name="N" queue={frame.queues.N} green={frame.green === "N"} />
        <Arm name="W" queue={frame.queues.W} green={frame.green === "W"} side />
        <div className="core">
          <b>{frame.green ? ARM_NAME[frame.green] : "Clear"}</b>
          <small>{formatSimTime(frame.t)}</small>
        </div>
        <Arm name="E" queue={frame.queues.E} green={frame.green === "E"} side />
        <Arm name="S" queue={frame.queues.S} green={frame.green === "S"} />
      </div>
      <dl>
        <div>
          <dt>Mean queue</dt>
          <dd>{summary.meanQueue.toFixed(0)}</dd>
        </div>
        <div>
          <dt>Peak</dt>
          <dd>{summary.peakQueue.toFixed(0)}</dd>
        </div>
        <div>
          <dt>Cleared</dt>
          <dd>{summary.departed.toFixed(0)}</dd>
        </div>
      </dl>
    </article>
  );
}

function Arm({ name, queue, green, side = false }: { name: Arm; queue: number; green: boolean; side?: boolean }) {
  const fill = Math.max(4, Math.min(100, (queue / 70) * 100));
  return (
    <div className={side ? "arm side" : "arm"} data-arm={name} data-green={green ? "true" : "false"}>
      <span>{ARM_NAME[name]}</span>
      <strong>{queue.toFixed(0)}</strong>
      <i style={{ width: `${fill}%` }} />
    </div>
  );
}

function Sparkline() {
  const width = 640;
  const height = 72;
  const fixedMax = Math.max(...FIXED.map(queueTotal), ...AI.map(queueTotal), 1);
  const path = (frames: SimFrame[]) =>
    frames
      .map((frame, i) => {
        const x = (i / (frames.length - 1)) * width;
        const y = height - (queueTotal(frame) / fixedMax) * (height - 4) - 2;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  return (
    <figure className="spark">
      <figcaption>
        <span>Queue, both plans</span>
        <span>
          <i data-tone="rotation" /> Rotation
        </span>
        <span>
          <i data-tone="ai" /> AI plan
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Queue over three minutes">
        <path d={path(FIXED)} />
        <path data-tone="ai" d={path(AI)} />
      </svg>
    </figure>
  );
}

function formatSimTime(t: number): string {
  const minute = Math.floor(t / 60);
  const second = t % 60;
  return `${minute}:${second.toString().padStart(2, "0")}`;
}
