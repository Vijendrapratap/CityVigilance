import { useState } from "react";
import { formatWhen } from "../format";
import { MODEL_MODES } from "../pipeline/sample";
import type { ModelEvent, ModelId } from "../pipeline/types";
import { useDesk } from "../useDesk";
import { Inbox, type InboxFilter } from "./Inbox";
import { IncidentReview } from "./IncidentReview";
import { LoopStrip, type LoopPhase } from "./LoopStrip";
import { MapPanel } from "./MapPanel";
import { OutcomeLog } from "./OutcomeLog";

export function DeskScreen({
  localEvents,
  clips,
  focusCameraId,
}: {
  localEvents: ModelEvent[];
  clips: Record<string, { url: string; name: string }>;
  focusCameraId: string | null;
}) {
  const desk = useDesk(localEvents);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("open");
  const focused =
    selectedId ??
    (focusCameraId
      ? (Object.entries(desk.state.incidents).find(([, incident]) => incident.cameraId === focusCameraId)?.[0] ?? null)
      : null);
  const selected = focused ? (desk.state.incidents[focused] ?? null) : null;
  const order = focused ? (desk.state.orders.find((item) => item.incidentId === focused) ?? null) : null;
  const phase: LoopPhase = !selected ? "idle" : selected.status === "open" ? "review" : "recorded";
  const clock = formatWhen(desk.now);
  const cameras: Record<string, string> = {};
  for (const [id, incident] of Object.entries(desk.state.incidents)) cameras[id] = incident.cameraId;
  const modes = modelModes(desk.events);

  function selectCamera(cameraId: string) {
    const match = Object.entries(desk.state.incidents).find(([, incident]) => incident.cameraId === cameraId);
    setSelectedId(match?.[0] ?? null);
  }

  return (
    <>
      <p className="clock desk-clock">
        <span>{clock.time} IST</span>
        <small>Desk clock · time zone is an assumption</small>
      </p>
      <LoopStrip phase={phase} />
      <div className="model-row" aria-label="Model plugs">
        {(Object.entries(modes) as [ModelId, string][]).map(([model, mode]) => (
          <span key={model}>
            {model} · {mode}
          </span>
        ))}
        <span>Dispatch · screen</span>
        <span>Signals · advice</span>
      </div>
      <div className="workspace">
        <MapPanel
          events={desk.events}
          incidents={desk.state.incidents}
          selectedCameraId={selected?.cameraId ?? focusCameraId}
          onSelectCamera={selectCamera}
        />
        <div className="side">
          <Inbox
            incidents={desk.state.incidents}
            events={desk.events}
            filter={filter}
            selectedId={focused}
            onFilter={setFilter}
            onSelect={setSelectedId}
          />
          <IncidentReview
            incidentId={focused}
            incident={selected}
            events={desk.events}
            order={order}
            clipUrl={selected ? (clips[selected.cameraId]?.url ?? null) : null}
            onPolice={(detail, note) => focused && desk.act({ type: "deploy-police", incidentId: focused, detail, note, at: new Date().toISOString() })}
            onAmbulance={(detail, note) =>
              focused && desk.act({ type: "deploy-ambulance", incidentId: focused, detail, note, at: new Date().toISOString() })
            }
            onSignal={(detail, note) => focused && desk.act({ type: "accept-signal", incidentId: focused, detail, note, at: new Date().toISOString() })}
            onDismiss={(reason, note) => focused && desk.act({ type: "dismiss", incidentId: focused, reason, note, at: new Date().toISOString() })}
          />
        </div>
      </div>
      <OutcomeLog
        orders={desk.state.orders}
        incidentCameras={cameras}
        selectedId={focused}
        onOpen={setSelectedId}
        onReset={desk.reset}
      />
    </>
  );
}

function modelModes(events: ModelEvent[]): Record<ModelId, string> {
  const modes = { ...MODEL_MODES };
  for (const event of events) {
    if (event.source === "local") modes[event.model] = "local";
  }
  return modes;
}
