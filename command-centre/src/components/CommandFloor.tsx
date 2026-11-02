import { useEffect, useMemo, useState } from "react";
import { analyzeClip, modelHealth, type ModelHealth } from "../analyzeClient";
import { MODULE_ORDER, MODULES, SHOWCASE } from "../catalog";
import { formatWhen } from "../format";
import { weaponLabel } from "../pipeline/sample";
import type { IncidentKind, ModelEvent, ModelId } from "../pipeline/types";
import { useDesk } from "../useDesk";
import { ActionDialog, type DialogMode } from "./ActionDialog";
import { OutcomeLog } from "./OutcomeLog";

type Mode = "demo" | "live";
type Clip = { url: string; name: string };

const KIND: Record<ModelId, IncidentKind> = {
  crowd: "crowd",
  movement: "crowd",
  weapon: "crowd",
  accident: "accident",
  traffic: "traffic",
  plate: "plate",
};

export function CommandFloor() {
  const [mode, setMode] = useState<Mode>("demo");
  const [selected, setSelected] = useState<ModelId>("crowd");
  const [health, setHealth] = useState<ModelHealth | null>(null);
  const [localByCamera, setLocalByCamera] = useState<Record<string, ModelEvent[]>>({});
  const [clips, setClips] = useState<Record<string, Clip>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const localEvents = useMemo(() => Object.values(localByCamera).flat(), [localByCamera]);
  const desk = useDesk(localEvents, mode);
  const module = MODULES[selected];
  const clip = clips[module.cameraId] ?? null;
  const mine = desk.events.filter((event) => event.model === selected);
  const reading = mine[0] ?? null;
  const incidentEntry = Object.entries(desk.state.incidents).find(
    ([, incident]) => incident.cameraId === module.cameraId && incident.kind === KIND[selected],
  );
  const incidentId = incidentEntry?.[0] ?? null;
  const incident = incidentEntry?.[1] ?? null;
  const order = incidentId ? (desk.state.orders.find((item) => item.incidentId === incidentId) ?? null) : null;
  const clock = formatWhen(desk.now);
  const cameras: Record<string, string> = {};
  for (const [id, record] of Object.entries(desk.state.incidents)) cameras[id] = record.cameraId;

  useEffect(() => {
    void modelHealth().then(setHealth);
  }, []);

  useEffect(() => {
    if (mode !== "demo" || clips[module.cameraId]) return;
    let cancelled = false;
    void fetchClip(selected)
      .then((file) => {
        if (!cancelled) remember(module.cameraId, file);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // The showcase picture loads with the story. Reading a feed replaces it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected, module.cameraId, clips]);

  useEffect(() => {
    desk.reset();
    // A mode change starts a fresh log so demo stories and live readings do not mix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setLocalByCamera({});
    setClips((prev) => {
      for (const item of Object.values(prev)) URL.revokeObjectURL(item.url);
      return {};
    });
    setError(null);
    setDialog(null);
    setMode(next);
  }

  function remember(cameraId: string, file: File) {
    setClips((prev) => {
      const previous = prev[cameraId];
      if (previous) URL.revokeObjectURL(previous.url);
      return { ...prev, [cameraId]: { url: URL.createObjectURL(file), name: file.name } };
    });
  }

  function place(event: ModelEvent) {
    setLocalByCamera((prev) => {
      const existing = prev[event.cameraId] ?? [];
      return { ...prev, [event.cameraId]: [...existing.filter((item) => item.model !== event.model), event] };
    });
  }

  async function watch() {
    setError(null);
    setBusy("Loading the clip");
    try {
      const file = await fetchClip(selected);
      remember(module.cameraId, file);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The clip did not load.");
    } finally {
      setBusy(null);
    }
  }

  async function readFile(file: File) {
    setError(null);
    setBusy("Reading the picture");
    remember(module.cameraId, file);
    try {
      const result = await analyzeClip(selected, file);
      place(result.event);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The model did not read this picture.");
    } finally {
      setBusy(null);
    }
  }

  const summary = summarize(reading);
  const liveEmpty = mode === "live" && !reading;

  return (
    <div className="floor" data-mode={mode}>
      <header className="floor-top">
        <div>
          <p className="product">CityVigilance</p>
          <h1>Command</h1>
        </div>
        <div className="mode-switch" role="group" aria-label="Operating mode">
          <button type="button" aria-pressed={mode === "demo"} onClick={() => switchMode("demo")}>
            Demo data
          </button>
          <button type="button" aria-pressed={mode === "live"} onClick={() => switchMode("live")}>
            Live pipeline
          </button>
        </div>
        <p className="clock">
          <span>{clock.time} IST</span>
          <small>{health?.ready ? "Model service on CPU" : "Model service not running"}</small>
        </p>
      </header>
      <div className="floor-body">
        <nav className="rail" aria-label="Modules">
          {MODULE_ORDER.map((id) => {
            const info = MODULES[id];
            const event = desk.events.find((item) => item.model === id);
            const cameraRead = desk.events.some((item) => item.cameraId === info.cameraId && item.source === "local");
            const line = event ? railLine(event) : cameraRead ? "Not read" : mode === "live" ? "Waiting" : "Demo";
            return (
              <button key={id} type="button" data-module={id} aria-pressed={selected === id} onClick={() => setSelected(id)}>
                <i />
                <span>
                  <strong>{info.title}</strong>
                  <small>{line}</small>
                </span>
              </button>
            );
          })}
        </nav>
        <section className="stage" data-module={selected} aria-label="Picture">
          <header>
            <p>{module.cameraName}</p>
            <h2>{reading?.source === "local" && clip ? clip.name : mode === "demo" ? "Demo story" : clip ? clip.name : "No feed attached"}</h2>
          </header>
          {clip ? <video className="hero-video" src={clip.url} controls autoPlay muted playsInline /> : <div className="hero-empty">{liveEmpty ? "Attach a file feed. A city camera is not connected." : "The reading on the right is the prepared story. Watch a clip when you want the picture."}</div>}
          <div className="stage-actions">
            <button type="button" className="ghost" disabled={!!busy} onClick={() => void watch()}>
              Watch showcase clip
            </button>
            <label className="upload">
              {busy ?? "Read a feed"}
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                disabled={!!busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readFile(file);
                }}
              />
            </label>
          </div>
          <p className="credit">{SHOWCASE[selected].credit}</p>
          {error ? <p className="run-error">{error}</p> : null}
        </section>
        <aside className="situation" data-module={selected} aria-live="polite">
          <p className="kicker">{module.department}</p>
          <h2>{module.question}</h2>
          {liveEmpty ? (
            <p className="hero-figure">Waiting</p>
          ) : (
            <p className="hero-figure">
              {summary.figure} {summary.unit ? <span>{summary.unit}</span> : null}
            </p>
          )}
          {summary.mark ? <p className="mark">{summary.mark}</p> : null}
          <p className="sit-copy">{liveEmpty ? "Live mode shows a reading only after a feed is read. Demo numbers stay off." : summary.copy}</p>
          <dl>
            <div>
              <dt>Source</dt>
              <dd>{reading?.source === "local" ? "This clip" : mode === "demo" ? "Demo data" : "No reading"}</dd>
            </div>
            <div>
              <dt>What it reads</dt>
              <dd>{module.reads}</dd>
            </div>
          </dl>
          {incident?.status === "open" ? (
            <div className="sit-actions">
              <button type="button" onClick={() => setDialog(actionMode(selected))}>
                {actionLabel(selected)}
              </button>
              <button type="button" className="ghost" onClick={() => setDialog("dismiss")}>
                Dismiss
              </button>
            </div>
          ) : order ? (
            <p className="sit-done">Recorded on this screen. Nothing was sent to a radio, 112, or a signal controller.</p>
          ) : (
            <p className="sit-done">{liveEmpty ? "No incident yet." : "Nothing is waiting for a decision on this module."}</p>
          )}
        </aside>
      </div>
      <OutcomeLog
        orders={desk.state.orders}
        incidentCameras={cameras}
        selectedId={incidentId}
        onOpen={(incidentId) => {
          const record = desk.state.incidents[incidentId];
          const match = MODULE_ORDER.find((moduleId) => KIND[moduleId] === record?.kind);
          if (match) setSelected(match);
        }}
        onReset={desk.reset}
      />
      {dialog && incidentId && incident?.status === "open" ? (
        <ActionDialog
          key={`${dialog}:${incidentId}`}
          mode={dialog}
          title={dialogTitle(dialog)}
          body={dialogBody(dialog)}
          plan={summary.figure}
          onClose={() => setDialog(null)}
          onConfirm={(note, reason) => {
            const at = new Date().toISOString();
            if (dialog === "police") desk.act({ type: "deploy-police", incidentId, detail: summary.figure, note, at });
            if (dialog === "ambulance") desk.act({ type: "deploy-ambulance", incidentId, detail: summary.figure, note, at });
            if (dialog === "signal") desk.act({ type: "accept-signal", incidentId, detail: summary.figure, note, at });
            if (dialog === "plate") desk.act({ type: "flag-plate", incidentId, detail: summary.figure, note, at });
            if (dialog === "dismiss" && reason) desk.act({ type: "dismiss", incidentId, reason, note, at });
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

async function fetchClip(moduleId: ModelId): Promise<File> {
  const showcase = SHOWCASE[moduleId];
  const response = await fetch(showcase.href);
  if (!response.ok) throw new Error("The showcase clip is not on this machine.");
  const blob = await response.blob();
  return new File([blob], `${showcase.title}.mp4`, { type: blob.type || "video/mp4" });
}

function summarize(event: ModelEvent | undefined): { figure: string; unit: string; copy: string; mark: string } {
  if (!event) return { figure: "—", unit: "", copy: "", mark: "" };
  const finding = event.finding;
  if (finding.type === "crowd") {
    return { figure: String(finding.count), unit: "people", copy: "A person confirms before police are recorded.", mark: "" };
  }
  if (finding.type === "movement") {
    return {
      figure: finding.level === "sudden" ? "Sudden" : "Steady",
      unit: `${finding.people} people`,
      copy: "A sudden change is a review for event security and police. It does not dispatch by itself.",
      mark: finding.level === "sudden" ? "Review" : "",
    };
  }
  if (finding.type === "weapon") {
    const label = weaponLabel(finding.kind);
    return {
      figure: finding.kind === "none" ? "Not decided" : label,
      unit: "",
      copy: event.note || "Possible matches include phones, tools, and ritual objects. The officer watches the clip.",
      mark: finding.kind === "none" ? "No weapon model" : "Possible · false matches expected",
    };
  }
  if (finding.type === "accident") {
    return {
      figure: finding.crash === null ? "Not decided" : finding.crash ? "Crash" : "No crash",
      unit: "",
      copy: event.note || "Deploy ambulance records the order here. 112 stays the public number.",
      mark: finding.crash ? "Review" : "",
    };
  }
  if (finding.type === "traffic") {
    const arm = finding.arms[0];
    const vehicles = finding.basis === "vehicles";
    return {
      figure: vehicles ? String(arm?.vehicles ?? 0) : `${arm?.greenSeconds ?? "—"}s`,
      unit: vehicles ? "vehicles" : arm ? `${arm.name} plan` : "",
      copy: event.note || "Storing the plan does not change a live signal.",
      mark: "",
    };
  }
  return {
    figure: finding.text,
    unit: "",
    copy: finding.complaint,
    mark: finding.listed ? "On the complaint list" : "Not listed",
  };
}

function railLine(event: ModelEvent): string {
  const summary = summarize(event);
  return summary.unit ? `${summary.figure} ${summary.unit}` : summary.figure;
}

function actionMode(moduleId: ModelId): DialogMode {
  if (moduleId === "accident") return "ambulance";
  if (moduleId === "traffic") return "signal";
  if (moduleId === "plate") return "plate";
  return "police";
}

function actionLabel(moduleId: ModelId): string {
  if (moduleId === "accident") return "Deploy ambulance";
  if (moduleId === "traffic") return "Accept signal plan";
  if (moduleId === "plate") return "Flag this plate";
  return "Deploy police";
}

function dialogTitle(mode: DialogMode): string {
  if (mode === "ambulance") return "Deploy ambulance";
  if (mode === "signal") return "Accept signal plan";
  if (mode === "plate") return "Flag this plate";
  if (mode === "dismiss") return "Dismiss";
  return "Deploy police";
}

function dialogBody(mode: DialogMode): string {
  if (mode === "ambulance") return "This records an ambulance order on the screen. It does not call 112.";
  if (mode === "signal") return "This stores the green time. It does not write to a signal controller.";
  if (mode === "plate") return "This flags the demo plate on the screen. It does not stop a vehicle.";
  if (mode === "dismiss") return "The reason stays in the outcome log.";
  return "This records a police order on the screen. It does not radio a unit.";
}
