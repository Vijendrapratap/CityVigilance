import { useState } from "react";
import { Inbox, type InboxFilter } from "./components/Inbox";
import { IncidentReview } from "./components/IncidentReview";
import { LoopStrip, type LoopPhase } from "./components/LoopStrip";
import { MapPanel } from "./components/MapPanel";
import { OutcomeLog } from "./components/OutcomeLog";
import { formatWhen } from "./format";
import { MODEL_MODES } from "./pipeline/sample";
import { useDesk } from "./useDesk";

export function App() {
  const desk = useDesk();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("open");
  const selected = selectedId ? (desk.state.incidents[selectedId] ?? null) : null;
  const order = selectedId ? (desk.state.orders.find((item) => item.incidentId === selectedId) ?? null) : null;
  const phase: LoopPhase = !selected ? "idle" : selected.status === "open" ? "review" : "recorded";
  const clock = formatWhen(desk.now);
  const cameras: Record<string, string> = {};
  for (const [id, incident] of Object.entries(desk.state.incidents)) cameras[id] = incident.cameraId;

  function selectCamera(cameraId: string) {
    const match = Object.entries(desk.state.incidents).find(([, incident]) => incident.cameraId === cameraId);
    setSelectedId(match?.[0] ?? null);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <p className="product">CityVigilance</p>
          <h1>Command centre</h1>
        </div>
        <p className="slice">Sample stream · four models · screen-only deploy · site not chosen</p>
        <p className="clock">
          <span>{clock.time} IST</span>
          <small>Desk clock · time zone is an assumption</small>
        </p>
      </header>
      <LoopStrip phase={phase} />
      <div className="model-row" aria-label="Model plugs">
        {(Object.entries(MODEL_MODES) as [string, string][]).map(([model, mode]) => (
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
          selectedCameraId={selected?.cameraId ?? null}
          onSelectCamera={selectCamera}
        />
        <div className="side">
          <Inbox
            incidents={desk.state.incidents}
            events={desk.events}
            filter={filter}
            selectedId={selectedId}
            onFilter={setFilter}
            onSelect={setSelectedId}
          />
          <IncidentReview
            incidentId={selectedId}
            incident={selected}
            events={desk.events}
            order={order}
            onPolice={(detail, note) => selectedId && desk.act({ type: "deploy-police", incidentId: selectedId, detail, note, at: new Date().toISOString() })}
            onAmbulance={(detail, note) =>
              selectedId && desk.act({ type: "deploy-ambulance", incidentId: selectedId, detail, note, at: new Date().toISOString() })
            }
            onSignal={(detail, note) => selectedId && desk.act({ type: "accept-signal", incidentId: selectedId, detail, note, at: new Date().toISOString() })}
            onDismiss={(reason, note) => selectedId && desk.act({ type: "dismiss", incidentId: selectedId, reason, note, at: new Date().toISOString() })}
          />
        </div>
      </div>
      <OutcomeLog
        orders={desk.state.orders}
        incidentCameras={cameras}
        selectedId={selectedId}
        onOpen={setSelectedId}
        onReset={desk.reset}
      />
      <footer className="footnote">
        Sample findings from the four demo models. City cameras, a vision API, dispatch, and a signal controller are not connected. IST is the working time-zone assumption.
      </footer>
    </div>
  );
}
