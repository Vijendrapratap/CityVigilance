import { useState } from "react";
import { formatWhenLine } from "../format";
import { orderLabel } from "../pipeline/desk";
import { cameraById, displayId, weaponLabel } from "../pipeline/sample";
import type { IncidentRecord, ModelEvent, Order } from "../pipeline/types";
import { ActionDialog, type DialogMode } from "./ActionDialog";

export function IncidentReview({
  incidentId,
  incident,
  events,
  order,
  onPolice,
  onAmbulance,
  onSignal,
  onDismiss,
}: {
  incidentId: string | null;
  incident: IncidentRecord | null;
  events: ModelEvent[];
  order: Order | null;
  onPolice: (detail: string, note: string) => void;
  onAmbulance: (detail: string, note: string) => void;
  onSignal: (detail: string, note: string) => void;
  onDismiss: (reason: string, note: string) => void;
}) {
  const [mode, setMode] = useState<DialogMode | null>(null);
  if (!incidentId || !incident) {
    return (
      <section className="panel review-panel" aria-label="Incident">
        <header className="panel-head">
          <h2>Incident</h2>
          <p>Command centre</p>
        </header>
        <p className="empty">Select an incident to see the sample finding and record an order.</p>
      </section>
    );
  }

  const camera = cameraById(incident.cameraId);
  const mine = events.filter((event) => event.cameraId === incident.cameraId);
  const detail = detailFor(incident, mine);
  const dialog = dialogCopy(mode, detail);

  return (
    <section className="panel review-panel" aria-label="Incident">
      <header className="panel-head">
        <h2>
          <span className="id">{displayId(incidentId)}</span> {heading(incident.kind)}
        </h2>
        <p>Sample finding · {camera?.name}</p>
      </header>
      <div className="review-body">
        <dl className="meta">
          <div>
            <dt>Camera</dt>
            <dd>{camera?.name}</dd>
          </div>
          <div>
            <dt>Models</dt>
            <dd>{modelLine(incident.kind)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatWhenLine(mine[0]?.at ?? incident.openedAt)}</dd>
          </div>
        </dl>
        <FindingBody incident={incident} events={mine} />
      </div>
      {incident.status === "open" ? (
        <div className="review-actions">
          {incident.kind === "crowd" && (
            <button type="button" onClick={() => setMode("police")}>
              Deploy police
            </button>
          )}
          {incident.kind === "accident" && (
            <button type="button" onClick={() => setMode("ambulance")}>
              Deploy ambulance
            </button>
          )}
          {incident.kind === "traffic" && (
            <button type="button" onClick={() => setMode("signal")}>
              Accept signal plan
            </button>
          )}
          <button type="button" className="ghost" onClick={() => setMode("dismiss")}>
            Dismiss
          </button>
        </div>
      ) : order ? (
        <div className="decision" data-action={order.action}>
          <p className="decision-label">{orderLabel(order.action)}</p>
          <p>{order.detail}</p>
          <p className="note">{order.note.trim() ? order.note : "No note."}</p>
          <p className="when">Recorded {formatWhenLine(order.at)} · screen-only adapter · this browser</p>
        </div>
      ) : null}
      {mode && incident.status === "open" && dialog ? (
        <ActionDialog
          key={`${mode}:${incidentId}`}
          mode={mode}
          title={dialog.title}
          body={dialog.body}
          plan={dialog.plan}
          onClose={() => setMode(null)}
          onConfirm={(note, reason) => {
            if (mode === "police") onPolice(detail, note);
            if (mode === "ambulance") onAmbulance(detail, note);
            if (mode === "signal") onSignal(detail, note);
            if (mode === "dismiss" && reason) onDismiss(reason, note);
            setMode(null);
          }}
        />
      ) : null}
    </section>
  );
}

function FindingBody({ incident, events }: { incident: IncidentRecord; events: ModelEvent[] }) {
  if (incident.kind === "crowd") {
    const crowd = events.find((event) => event.finding.type === "crowd");
    const weapon = events.find((event) => event.finding.type === "weapon");
    const count = crowd?.finding.type === "crowd" ? crowd.finding.count : null;
    const weaponText = weapon?.finding.type === "weapon" ? weaponLabel(weapon.finding.kind) : "Weapon model quiet";
    return (
      <div className="finding">
        <p className="count-hero">{count ?? "—"} <span>people</span></p>
        <p className={weaponText.startsWith("Possible") ? "weapon-line" : "quiet-line"}>{weaponText}</p>
        <p className="sample-note">Sample finding. The count updates from the crowd model. Deploy stays with the officer.</p>
      </div>
    );
  }
  if (incident.kind === "accident") {
    return (
      <div className="finding">
        <p className="count-hero crash">Crash</p>
        <p className="sample-note">Sample finding from the accident model. Deploy ambulance records the order on this screen.</p>
        <svg viewBox="0 0 640 120" className="still-svg" role="img" aria-label="Sample road picture with two vehicles stopped across the lane">
          <rect width="640" height="120" fill="#0e141b" />
          <rect x="40" y="36" width="560" height="48" fill="#3a4656" />
          <rect x="250" y="46" width="70" height="28" fill="#d7dee8" />
          <rect x="330" y="50" width="64" height="26" fill="#e7b3a8" transform="rotate(12 362 63)" />
          <text x="16" y="110" fill="#c5d0dc" fontSize="13">Sample still · Road camera 1 · no city camera connected</text>
        </svg>
      </div>
    );
  }
  const traffic = events.find((event) => event.finding.type === "traffic");
  const arms = traffic?.finding.type === "traffic" ? traffic.finding.arms : [];
  return (
    <div className="finding">
      <ul className="arms">
        {arms.map((arm) => (
          <li key={arm.name}>
            <span>{arm.name}</span>
            <span className="bar" aria-hidden="true"><i style={{ width: `${Math.min(100, arm.queueMetres)}%` }} /></span>
            <span>{arm.queueMetres} m</span>
            <span>Now {arm.currentGreenSeconds}s</span>
            <span>Plan {arm.greenSeconds}s</span>
          </li>
        ))}
      </ul>
      <p className="sample-note">Sample finding from the traffic model. Storing the plan does not write to a signal controller.</p>
    </div>
  );
}

function heading(kind: IncidentRecord["kind"]): string {
  if (kind === "crowd") return "Crowd";
  if (kind === "accident") return "Accident";
  return "Signal plan";
}

function modelLine(kind: IncidentRecord["kind"]): string {
  if (kind === "crowd") return "Crowd count + weapon check";
  if (kind === "accident") return "Accident";
  return "Traffic queues";
}

function detailFor(incident: IncidentRecord, events: ModelEvent[]): string {
  if (incident.kind === "crowd") {
    const crowd = events.find((event) => event.finding.type === "crowd");
    const weapon = events.find((event) => event.finding.type === "weapon");
    const count = crowd?.finding.type === "crowd" ? `${crowd.finding.count} people` : "Crowd";
    const weaponText = weapon?.finding.type === "weapon" ? weaponLabel(weapon.finding.kind) : "";
    return weaponText ? `${count} · ${weaponText}` : count;
  }
  if (incident.kind === "accident") return "Crash on Road camera 1";
  const traffic = events.find((event) => event.finding.type === "traffic");
  if (traffic?.finding.type !== "traffic") return "Signal plan";
  return traffic.finding.arms.map((arm) => `${arm.name} ${arm.greenSeconds}s`).join(", ");
}

function dialogCopy(mode: DialogMode | null, detail: string): { title: string; body: string; plan?: string } | null {
  if (mode === "police") {
    return {
      title: "Deploy police",
      body: "This records a police order for the crowd incident. The demo adapter keeps it on this screen. It does not radio a unit.",
      plan: detail,
    };
  }
  if (mode === "ambulance") {
    return {
      title: "Deploy ambulance",
      body: "This records an ambulance order. 112 stays the public number. The demo adapter does not call a dispatch system.",
      plan: detail,
    };
  }
  if (mode === "signal") {
    return {
      title: "Accept signal plan",
      body: "This stores the suggested greens. A connected controller is required before any light changes.",
      plan: detail,
    };
  }
  if (mode === "dismiss") {
    return { title: "Dismiss incident", body: "The clip and your reason stay in the outcome log." };
  }
  return null;
}
