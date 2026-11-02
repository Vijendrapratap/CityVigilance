import { cameraById, displayId, weaponLabel } from "../pipeline/sample";
import type { IncidentRecord, ModelEvent } from "../pipeline/types";

export type InboxFilter = "open" | "acted" | "all";

const ORDER = ["crowd", "accident", "traffic"] as const;

export function Inbox({
  incidents,
  events,
  filter,
  selectedId,
  onFilter,
  onSelect,
}: {
  incidents: Record<string, IncidentRecord>;
  events: ModelEvent[];
  filter: InboxFilter;
  selectedId: string | null;
  onFilter: (filter: InboxFilter) => void;
  onSelect: (incidentId: string) => void;
}) {
  const rows = Object.entries(incidents)
    .map(([id, incident]) => ({ id, incident }))
    .filter(({ incident }) => {
      if (filter === "open") return incident.status === "open";
      if (filter === "acted") return incident.status !== "open";
      return true;
    })
    .sort((a, b) => ORDER.indexOf(a.incident.kind) - ORDER.indexOf(b.incident.kind));
  const openCount = Object.values(incidents).filter((incident) => incident.status === "open").length;

  return (
    <section className="panel inbox-panel" aria-label="Incidents">
      <header className="panel-head">
        <h2>Incidents</h2>
        <p>{openCount} open</p>
      </header>
      <div className="filters" role="group" aria-label="Incident filter">
        {(
          [
            ["open", "Open"],
            ["acted", "Acted"],
            ["all", "All"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => onFilter(value)}>
            {label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="empty">No incidents in this filter.</p>
      ) : (
        <ul className="inbox-list">
          {rows.map(({ id, incident }) => {
            const camera = cameraById(incident.cameraId);
            return (
              <li key={id}>
                <button type="button" className="inbox-row" aria-pressed={selectedId === id} onClick={() => onSelect(id)}>
                  <span className="id">{displayId(id)}</span>
                  <span className="when">{kindLabel(incident.kind)}</span>
                  <span className="place">
                    {camera?.name} · {detailLine(incident.cameraId, incident.kind, events)}
                  </span>
                  <span className="status" data-status={incident.status}>
                    {statusLabel(incident.status)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function kindLabel(kind: IncidentRecord["kind"]): string {
  if (kind === "crowd") return "Crowd";
  if (kind === "accident") return "Accident";
  return "Signal plan";
}

function statusLabel(status: IncidentRecord["status"]): string {
  if (status === "open") return "Open";
  if (status === "deployed") return "Deployed";
  if (status === "accepted") return "Plan stored";
  return "Dismissed";
}

function detailLine(cameraId: string, kind: IncidentRecord["kind"], events: ModelEvent[]): string {
  const mine = events.filter((event) => event.cameraId === cameraId);
  if (kind === "crowd") {
    const crowd = mine.find((event) => event.finding.type === "crowd");
    const weapon = mine.find((event) => event.finding.type === "weapon");
    const count = crowd?.finding.type === "crowd" ? `${crowd.finding.count} people` : "Count updating";
    const weaponText = weapon?.finding.type === "weapon" ? weaponLabel(weapon.finding.kind) : "";
    return weaponText && weaponText !== "No weapon shape" ? `${count} · ${weaponText}` : count;
  }
  if (kind === "accident") return "Crash reported by the accident model";
  const traffic = mine.find((event) => event.finding.type === "traffic");
  if (traffic?.finding.type === "traffic") {
    const longest = [...traffic.finding.arms].sort((a, b) => b.queueMetres - a.queueMetres)[0];
    return longest ? `${longest.name} ${longest.queueMetres} m · plan ${longest.greenSeconds}s` : "Queues";
  }
  return "Reading";
}
