import { CAMERAS, weaponLabel } from "../pipeline/sample";
import { MAP_HEIGHT, MAP_WIDTH, type IncidentRecord, type ModelEvent } from "../pipeline/types";

export function MapPanel({
  events,
  incidents,
  selectedCameraId,
  onSelectCamera,
}: {
  events: ModelEvent[];
  incidents: Record<string, IncidentRecord>;
  selectedCameraId: string | null;
  onSelectCamera: (cameraId: string) => void;
}) {
  return (
    <section className="panel map-panel" aria-label="Command map">
      <header className="panel-head">
        <h2>Command map</h2>
        <p>Sample cameras. No city is selected.</p>
      </header>
      <div className="map-stage">
        <div className="map-frame">
          <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
            <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#12181f" />
            <Road d="M80 168 H720" />
            <Road d="M200 40 V300" />
            <Road d="M600 40 V300" />
            <Road d="M400 168 V480" />
            <Road d="M220 400 H580" />
          </svg>
          <ul className="legend">
            <li><i data-tone="open" /> Open incident</li>
            <li><i data-tone="acted" /> Acted</li>
            <li><i data-tone="crowd" /> Live reading</li>
          </ul>
          {CAMERAS.map((camera) => {
            const reading = liveLabel(camera.id, events);
            const open = Object.values(incidents).some(
              (incident) => incident.cameraId === camera.id && incident.status === "open",
            );
            const acted = Object.values(incidents).some(
              (incident) => incident.cameraId === camera.id && incident.status !== "open",
            );
            const tone = open ? "open" : acted ? "acted" : "crowd";
            return (
              <button
                key={camera.id}
                type="button"
                className="pin"
                data-tone={tone}
                data-selected={selectedCameraId === camera.id}
                style={{ left: `${(camera.x / MAP_WIDTH) * 100}%`, top: `${(camera.y / MAP_HEIGHT) * 100}%` }}
                onClick={() => onSelectCamera(camera.id)}
              >
                <span className="pin-label">
                  {camera.name}
                  <small>{reading}</small>
                </span>
                <span className="pin-dot" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function liveLabel(cameraId: string, events: ModelEvent[]): string {
  const mine = events.filter((event) => event.cameraId === cameraId);
  const crowd = mine.find((event) => event.finding.type === "crowd");
  const weapon = mine.find((event) => event.finding.type === "weapon");
  if (crowd?.finding.type === "crowd") {
    const weaponText =
      weapon?.finding.type === "weapon" && weapon.finding.kind !== "none" ? ` · ${weaponLabel(weapon.finding.kind)}` : "";
    return `${crowd.finding.count} people${weaponText}`;
  }
  const accident = mine.find((event) => event.finding.type === "accident");
  if (accident?.finding.type === "accident" && accident.finding.crash) return "Accident";
  const traffic = mine.find((event) => event.finding.type === "traffic");
  if (traffic?.finding.type === "traffic") {
    const longest = [...traffic.finding.arms].sort((a, b) => b.queueMetres - a.queueMetres)[0];
    return longest ? `${longest.name} queue ${longest.queueMetres} m` : "Queues";
  }
  return "No reading";
}

function Road({ d }: { d: string }) {
  return (
    <g>
      <path d={d} stroke="#1a212b" strokeWidth="48" fill="none" />
      <path d={d} stroke="#3a4656" strokeWidth="36" fill="none" />
      <path d={d} stroke="#6a7b8e" strokeWidth="1.25" strokeDasharray="8 12" fill="none" />
    </g>
  );
}
