import type { DeskState, IncidentSpec, OrderAction } from "./types";

export function emptyDesk(): DeskState {
  return { incidents: {}, orders: [] };
}

export function ensureIncidents(state: DeskState, specs: IncidentSpec[], at: string): DeskState {
  const incidents = { ...state.incidents };
  for (const spec of specs) {
    if (!incidents[spec.id]) {
      incidents[spec.id] = {
        cameraId: spec.cameraId,
        kind: spec.kind,
        status: "open",
        openedAt: at,
      };
    }
  }
  return { incidents, orders: state.orders };
}

export type DeskAction =
  | { type: "sync"; specs: IncidentSpec[]; at: string }
  | { type: "deploy-police"; incidentId: string; detail: string; note: string; at: string }
  | { type: "deploy-ambulance"; incidentId: string; detail: string; note: string; at: string }
  | { type: "accept-signal"; incidentId: string; detail: string; note: string; at: string }
  | { type: "dismiss"; incidentId: string; reason: string; note: string; at: string }
  | { type: "reset"; specs: IncidentSpec[]; at: string };

export function reduceDesk(state: DeskState, action: DeskAction): DeskState {
  if (action.type === "sync") return ensureIncidents(state, action.specs, action.at);
  if (action.type === "reset") return ensureIncidents(emptyDesk(), action.specs, action.at);

  const incident = state.incidents[action.incidentId];
  if (!incident || incident.status !== "open") return state;

  if (action.type === "deploy-police" && incident.kind !== "crowd") return state;
  if (action.type === "deploy-ambulance" && incident.kind !== "accident") return state;
  if (action.type === "accept-signal" && incident.kind !== "traffic") return state;

  if (action.type === "dismiss") {
    const reason = action.reason.trim();
    const note = action.note.trim();
    if (!reason) return state;
    if (reason === "Other" && note.length === 0) return state;
    return close(state, action.incidentId, "dismissed", "dismiss", reason, note, action.at);
  }

  const note = action.note.trim();
  const detail = action.detail.trim();
  if (!detail) return state;
  if (action.type === "deploy-police") return close(state, action.incidentId, "deployed", "deploy-police", detail, note, action.at);
  if (action.type === "deploy-ambulance") {
    return close(state, action.incidentId, "deployed", "deploy-ambulance", detail, note, action.at);
  }
  return close(state, action.incidentId, "accepted", "accept-signal", detail, note, action.at);
}

export function orderLabel(action: OrderAction): string {
  if (action === "deploy-police") return "Police order";
  if (action === "deploy-ambulance") return "Ambulance order";
  if (action === "accept-signal") return "Signal plan stored";
  return "Dismissed";
}

export function hydrateDesk(raw: unknown): DeskState {
  const base = emptyDesk();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as { version?: unknown; state?: unknown };
  if (parsed.version !== 1 || !parsed.state || typeof parsed.state !== "object") return base;
  const stored = parsed.state as { incidents?: unknown; orders?: unknown };
  const incidents: DeskState["incidents"] = {};
  if (stored.incidents && typeof stored.incidents === "object") {
    for (const [id, value] of Object.entries(stored.incidents)) {
      if (!value || typeof value !== "object") continue;
      const record = value as Record<string, unknown>;
      if (
        typeof record.cameraId === "string" &&
        (record.kind === "crowd" || record.kind === "accident" || record.kind === "traffic") &&
        (record.status === "open" || record.status === "deployed" || record.status === "accepted" || record.status === "dismissed") &&
        typeof record.openedAt === "string"
      ) {
        incidents[id] = {
          cameraId: record.cameraId,
          kind: record.kind,
          status: record.status,
          openedAt: record.openedAt,
        };
      }
    }
  }
  const orders = Array.isArray(stored.orders) ? stored.orders.filter(isOrder) : [];
  return { incidents, orders };
}

function close(
  state: DeskState,
  incidentId: string,
  status: "deployed" | "accepted" | "dismissed",
  action: OrderAction,
  detail: string,
  note: string,
  at: string,
): DeskState {
  const current = state.incidents[incidentId];
  if (!current) return state;
  return {
    incidents: {
      ...state.incidents,
      [incidentId]: { ...current, status },
    },
    orders: [
      {
        id: `${incidentId}:${at}`,
        incidentId,
        action,
        detail,
        note,
        at,
        adapter: "screen",
      },
      ...state.orders,
    ],
  };
}

function isOrder(value: unknown): value is DeskState["orders"][number] {
  if (!value || typeof value !== "object") return false;
  const order = value as Record<string, unknown>;
  return (
    typeof order.id === "string" &&
    typeof order.incidentId === "string" &&
    (order.action === "deploy-police" ||
      order.action === "deploy-ambulance" ||
      order.action === "accept-signal" ||
      order.action === "dismiss") &&
    typeof order.detail === "string" &&
    typeof order.note === "string" &&
    typeof order.at === "string" &&
    order.adapter === "screen"
  );
}
