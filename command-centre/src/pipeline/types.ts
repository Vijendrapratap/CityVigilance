export type ModelId = "crowd" | "movement" | "weapon" | "accident" | "traffic" | "plate";

export type ModelMode = "sample" | "api" | "local" | "off";

export type CameraKind = "crowd" | "road" | "junction";

export type Camera = {
  id: string;
  name: string;
  kind: CameraKind;
  x: number;
  y: number;
};

export type Frame = {
  cameraId: string;
  at: string;
  sequence: number;
  source: "sample";
};

export type CrowdFinding = { type: "crowd"; count: number };

export type MovementFinding = { type: "movement"; level: "steady" | "sudden"; people: number };

export type WeaponFinding = { type: "weapon"; kind: "firearm" | "blade" | "none" };

export type AccidentFinding = { type: "accident"; crash: boolean | null };

export type TrafficArm = {
  name: string;
  queueMetres: number;
  currentGreenSeconds: number;
  greenSeconds: number;
  vehicles?: number;
};

export type TrafficFinding = { type: "traffic"; arms: TrafficArm[]; basis?: "metres" | "vehicles" };

export type PlateFinding = { type: "plate"; text: string; listed: boolean; complaint: string };

export type Finding = CrowdFinding | MovementFinding | WeaponFinding | AccidentFinding | TrafficFinding | PlateFinding;

export type ModelEvent = {
  id: string;
  cameraId: string;
  model: ModelId;
  at: string;
  sequence: number;
  source: "sample" | "api" | "local";
  strength: "high" | "review";
  finding: Finding;
  note?: string;
  detector?: string;
  device?: string;
};

export type IncidentKind = "crowd" | "accident" | "traffic" | "plate";

export type IncidentStatus = "open" | "deployed" | "accepted" | "dismissed";

export type IncidentRecord = {
  cameraId: string;
  kind: IncidentKind;
  status: IncidentStatus;
  openedAt: string;
};

export type OrderAction = "deploy-police" | "deploy-ambulance" | "accept-signal" | "flag-plate" | "dismiss";

export type Order = {
  id: string;
  incidentId: string;
  action: OrderAction;
  detail: string;
  note: string;
  at: string;
  adapter: "screen";
};

export type DeskState = {
  incidents: Record<string, IncidentRecord>;
  orders: Order[];
};

export type IncidentSpec = {
  id: string;
  cameraId: string;
  kind: IncidentKind;
};

export const DISMISS_REASONS = [
  "Reading does not match the picture",
  "Not a weapon",
  "Not a crash",
  "Signal picture does not match",
  "Other",
] as const;

export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 520;
