import { useEffect, useState } from "react";
import { analyzeClip } from "../analyzeClient";
import { formatWhen } from "../format";
import { ALERT_LABEL, CAMERAS, FOCUS_CAMERA, cameraById, toneOf, type WallAlert, type WallCamera } from "../wall/script";
import { Chrome } from "./Chrome";

type Mode = "demo" | "live";

type Feed = {
  url: string;
  name: string;
  alerts: WallAlert[];
  note: string;
};

type RecordItem = {
  id: string;
  camera: string;
  label: string;
  detail: string;
  at: string;
};

export function Monitor({ onHome }: { onHome: () => void }) {
  const [mode, setMode] = useState<Mode>("demo");
  const [focus, setFocus] = useState<string | null>(null);
  const [cleared, setCleared] = useState<Record<string, true>>({});
  const [feeds, setFeeds] = useState<Record<string, Feed>>({});
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setFocus((current) => current ?? FOCUS_CAMERA), reduce ? 400 : 1600);
    return () => window.clearTimeout(id);
  }, [mode]);

  function alertsFor(camera: WallCamera): WallAlert[] {
    const feed = feeds[camera.id];
    if (feed) return feed.alerts;
    if (mode === "live" || cleared[camera.id]) return [];
    return camera.alerts;
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setFeeds((prev) => {
      for (const feed of Object.values(prev)) URL.revokeObjectURL(feed.url);
      return {};
    });
    setCleared({});
    setRecords([]);
    setFocus(null);
    setError(null);
    setMode(next);
  }

  function clearCamera(cameraId: string) {
    setCleared((prev) => ({ ...prev, [cameraId]: true }));
    setFeeds((prev) => {
      const feed = prev[cameraId];
      if (!feed) return prev;
      return { ...prev, [cameraId]: { ...feed, alerts: [] } };
    });
    setFocus(null);
  }

  function record(camera: WallCamera, alert: WallAlert) {
    const at = new Date().toISOString();
    setRecords((prev) => [
      { id: `${camera.id}:${alert.kind}:${at}`, camera: camera.code, label: alert.actionLabel, detail: alert.title, at },
      ...prev,
    ]);
    clearCamera(camera.id);
  }

  async function readFeed(camera: WallCamera, file: File) {
    setError(null);
    setBusy(camera.id);
    const url = URL.createObjectURL(file);
    setFeeds((prev) => {
      const previous = prev[camera.id];
      if (previous) URL.revokeObjectURL(previous.url);
      return { ...prev, [camera.id]: { url, name: file.name, alerts: [], note: "Reading the picture." } };
    });
    setFocus(camera.id);
    try {
      const result = await analyzeClip("movement", file);
      const finding = result.event.finding;
      const sudden = finding.type === "movement" && finding.level === "sudden";
      const people = finding.type === "movement" ? finding.people : 0;
      const alerts: WallAlert[] = sudden
        ? [
            {
              kind: "gathering",
              title: "Sudden grouping",
              detail: `The busiest frame separated ${people} people and jumped from a quieter frame. Weapon, face, plate, and crash models are not loaded, so those marks are not raised.`,
              action: "police",
              actionLabel: "Record police",
            },
          ]
        : [];
      setFeeds((prev) => ({
        ...prev,
        [camera.id]: {
          url,
          name: file.name,
          alerts,
          note: sudden
            ? "Gathering mark from this clip."
            : `Steady. The detector separated ${people} people. No gathering mark.`,
        },
      }));
      setCleared((prev) => {
        const next = { ...prev };
        delete next[camera.id];
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The clip could not be read.");
    } finally {
      setBusy(null);
    }
  }

  const focused = focus ? cameraById(focus) : undefined;

  return (
    <section className="screen" data-mode={mode}>
      <Chrome title="Monitor" onHome={onHome}>
        <div className="mode-switch" role="group" aria-label="Operating mode">
          <button type="button" aria-pressed={mode === "demo"} onClick={() => switchMode("demo")}>
            Demo
          </button>
          <button type="button" aria-pressed={mode === "live"} onClick={() => switchMode("live")}>
            Live
          </button>
        </div>
      </Chrome>
      {focused ? (
        <div className="focused">
          <Picture camera={focused} alerts={alertsFor(focused)} src={feeds[focused.id]?.url} showClip={mode === "demo"} enlarged />
          <Decision
            camera={focused}
            alerts={alertsFor(focused)}
            note={feeds[focused.id]?.note}
            busy={busy === focused.id}
            error={error}
            onWall={() => setFocus(null)}
            onClear={() => clearCamera(focused.id)}
            onRecord={(alert) => record(focused, alert)}
            onFile={(file) => void readFeed(focused, file)}
          />
          <div className="strip" aria-label="All cameras">
            {CAMERAS.map((camera) => (
              <Picture
                key={camera.id}
                camera={camera}
                alerts={alertsFor(camera)}
                src={feeds[camera.id]?.url}
                showClip={mode === "demo"}
                selected={camera.id === focused.id}
                compact
                onOpen={() => setFocus(camera.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mosaic">
          {CAMERAS.map((camera) => (
            <Picture
              key={camera.id}
              camera={camera}
              alerts={alertsFor(camera)}
              src={feeds[camera.id]?.url}
              showClip={mode === "demo"}
              pending={mode === "demo" && camera.id === FOCUS_CAMERA && !cleared[camera.id] && !feeds[camera.id]}
              onOpen={() => setFocus(camera.id)}
            />
          ))}
        </div>
      )}
      <RecordStrip records={records} />
    </section>
  );
}

function Picture({
  camera,
  alerts,
  src,
  showClip,
  enlarged = false,
  compact = false,
  selected = false,
  pending = false,
  onOpen,
}: {
  camera: WallCamera;
  alerts: WallAlert[];
  src?: string;
  showClip: boolean;
  enlarged?: boolean;
  compact?: boolean;
  selected?: boolean;
  pending?: boolean;
  onOpen?: () => void;
}) {
  const tone = toneOf(alerts);
  const href = src ?? (showClip ? camera.clip : null);
  const Tag = onOpen ? "button" : "div";
  return (
    <Tag
      {...(onOpen ? { type: "button" as const, onClick: onOpen } : {})}
      className={enlarged ? "stage" : "tile"}
      data-alert={tone ?? "clear"}
      data-pending={pending ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
    >
      {href ? (
        <video src={href} className={camera.fit} autoPlay muted loop playsInline />
      ) : (
        <p className="empty-feed">No feed</p>
      )}
      {camera.watchBox && alerts.some((alert) => alert.kind === "watchlist") ? (
        <span className="watch-box">
          <span>Demo record</span>
        </span>
      ) : null}
      <span className="tile-id">
        <b>{camera.code}</b>
        {compact ? null : camera.name}
      </span>
      {alerts.length > 0 && !compact ? (
        <span className="marks">
          {alerts.map((alert) => (
            <span key={alert.kind} className="tile-kind" data-kind={alert.kind}>
              {ALERT_LABEL[alert.kind]}
            </span>
          ))}
        </span>
      ) : null}
    </Tag>
  );
}

function Decision({
  camera,
  alerts,
  note,
  busy,
  error,
  onWall,
  onClear,
  onRecord,
  onFile,
}: {
  camera: WallCamera;
  alerts: WallAlert[];
  note?: string;
  busy: boolean;
  error: string | null;
  onWall: () => void;
  onClear: () => void;
  onRecord: (alert: WallAlert) => void;
  onFile: (file: File) => void;
}) {
  const tone = toneOf(alerts);
  return (
    <aside className="decision" data-alert={tone ?? "clear"}>
      <button type="button" className="text-btn" onClick={onWall}>
        All cameras
      </button>
      <p className="eyebrow">{camera.code}</p>
      <h2>{alerts[0] ? alerts.map((alert) => alert.title).join(" · ") : camera.name}</h2>
      {alerts.length === 0 ? (
        <p className="copy">This camera is clear. Read a file when you want a gathering check from the detector.</p>
      ) : (
        alerts.map((alert) => (
          <p key={alert.kind} className="copy">
            {alert.detail}
          </p>
        ))
      )}
      {note ? <p className="note">{note}</p> : null}
      <p className="credit">{camera.credit}</p>
      <div className="decision-actions">
        {uniqueActions(alerts).map((alert) => (
          <button key={alert.action} type="button" className="act" data-alert={alert.kind} onClick={() => onRecord(alert)}>
            {alert.actionLabel}
          </button>
        ))}
        {alerts.length > 0 ? (
          <button type="button" className="text-btn" onClick={onClear}>
            False match
          </button>
        ) : null}
        <label className="text-btn file-btn">
          {busy ? "Reading" : "Read a feed"}
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {error ? <p className="note warn">{error}</p> : null}
    </aside>
  );
}

function uniqueActions(alerts: WallAlert[]): WallAlert[] {
  const seen = new Set<string>();
  return alerts.filter((alert) => {
    if (seen.has(alert.action)) return false;
    seen.add(alert.action);
    return true;
  });
}

function RecordStrip({ records }: { records: RecordItem[] }) {
  return (
    <footer className="records" aria-label="Outcome log">
      {records.length === 0 ? (
        <p>No order yet. A confirmation stays on this screen.</p>
      ) : (
        <ol>
          {records.slice(0, 4).map((record) => {
            const when = formatWhen(record.at);
            return (
              <li key={record.id}>
                <span>{when.time} IST</span>
                <span>{record.camera}</span>
                <span>{record.label}</span>
                <span>{record.detail}</span>
              </li>
            );
          })}
        </ol>
      )}
    </footer>
  );
}
