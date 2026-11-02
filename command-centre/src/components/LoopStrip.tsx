export type LoopPhase = "idle" | "review" | "recorded";

const STEPS = [
  { id: "camera", label: "Camera" },
  { id: "models", label: "Models" },
  { id: "incident", label: "Incident" },
  { id: "action", label: "Officer" },
  { id: "log", label: "Outcome log" },
] as const;

const CAPTION: Record<LoopPhase, string> = {
  idle: "Select an incident. Counts and queues keep updating from the sample stream.",
  review: "Sample models produced this incident. Watch the picture, then deploy or dismiss.",
  recorded: "Order stored on this screen. Open the log row to read it again.",
};

export function LoopStrip({ phase }: { phase: LoopPhase }) {
  return (
    <div className="loop" aria-label="Operating loop">
      <ol>
        {STEPS.map((step, index) => {
          const mark = markFor(phase, index);
          return (
            <li key={step.id} data-mark={mark}>
              <span className="loop-index">{index + 1}</span>
              {step.label}
            </li>
          );
        })}
      </ol>
      <p>{CAPTION[phase]}</p>
    </div>
  );
}

function markFor(phase: LoopPhase, index: number): "waiting" | "done" | "current" {
  if (phase === "idle") return "waiting";
  if (phase === "review") return index < 3 ? "done" : index === 3 ? "current" : "waiting";
  return index === 4 ? "current" : "done";
}
