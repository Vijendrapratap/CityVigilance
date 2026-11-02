import type { ModelId } from "./pipeline/types";

export type DepartmentId = "police" | "traffic" | "emergency" | "events";

export type Department = {
  id: DepartmentId;
  name: string;
  sits: string;
  can: string;
  holds: string;
  modules: ModelId[];
};

export type ModuleInfo = {
  id: ModelId;
  title: string;
  question: string;
  cameraId: string;
  cameraName: string;
  reads: string;
  department: string;
  tone: ModelId;
};

export const DEPARTMENTS: Department[] = [
  {
    id: "police",
    name: "Police",
    sits: "Officers watching a crowd camera",
    can: "Record a police order after a person confirms the clip",
    holds: "A weapon line stays a possible match. The order stays on this screen until a dispatch system is named.",
    modules: ["crowd", "movement", "weapon"],
  },
  {
    id: "traffic",
    name: "Traffic",
    sits: "The junction desk",
    can: "Accept a signal plan and store it in the outcome log",
    holds: "The plan stays advice until a signal controller is named. Queue metres are measured only when a traffic model reports metres.",
    modules: ["traffic", "plate"],
  },
  {
    id: "emergency",
    name: "Emergency dispatch",
    sits: "Dispatchers watching a road camera",
    can: "Record an ambulance order after a person confirms the clip",
    holds: "112 stays the public number. This desk does not place that call.",
    modules: ["accident"],
  },
  {
    id: "events",
    name: "Event security",
    sits: "The ground team at a crowd site",
    can: "Read the same people count the police desk uses",
    holds: "A sudden movement is a review for the police desk. It is not an order by itself.",
    modules: ["crowd", "movement"],
  },
];

export const MODULE_ORDER: ModelId[] = ["crowd", "movement", "weapon", "accident", "traffic", "plate"];

export const MODULES: Record<ModelId, ModuleInfo> = {
  crowd: {
    id: "crowd",
    title: "Crowd",
    question: "How many people are in this view?",
    cameraId: "cam-crowd",
    cameraName: "Crowd camera 1",
    reads: "People the detector can separate",
    department: "Police",
    tone: "crowd",
  },
  movement: {
    id: "movement",
    title: "Movement",
    question: "Did the crowd change suddenly?",
    cameraId: "cam-crowd",
    cameraName: "Crowd camera 1",
    reads: "A jump in the people count across the clip",
    department: "Event security",
    tone: "movement",
  },
  weapon: {
    id: "weapon",
    title: "Weapon",
    question: "Is there a shape like a firearm or a blade?",
    cameraId: "cam-crowd",
    cameraName: "Crowd camera 1",
    reads: "Marked possible. False matches are expected until a weapon model is loaded.",
    department: "Police",
    tone: "weapon",
  },
  accident: {
    id: "accident",
    title: "Accident",
    question: "Is there a crash on this road?",
    cameraId: "cam-road",
    cameraName: "Road camera 1",
    reads: "A crash model, when one is loaded. Until then the officer watches the clip.",
    department: "Emergency dispatch",
    tone: "accident",
  },
  traffic: {
    id: "traffic",
    title: "Traffic",
    question: "Can a longer green clear this approach?",
    cameraId: "cam-junction",
    cameraName: "Junction camera 1",
    reads: "Vehicles in the frame, then a stored green time",
    department: "Traffic",
    tone: "traffic",
  },
  plate: {
    id: "plate",
    title: "Plates",
    question: "Is this plate on the complaint list?",
    cameraId: "cam-junction",
    cameraName: "Junction camera 1",
    reads: "A plate reader checked against the complaint list",
    department: "Traffic",
    tone: "plate",
  },
};

export type ShowcaseClip = {
  href: string;
  title: string;
  credit: string;
};

export const SHOWCASE: Record<ModelId, ShowcaseClip> = {
  crowd: {
    href: "/showcase/crowd.mp4",
    title: "Sabana Grande boulevard",
    credit: "Vicente Quintero, CC BY 3.0, via Wikimedia Commons",
  },
  weapon: {
    href: "/showcase/crowd.mp4",
    title: "Sabana Grande boulevard",
    credit: "Vicente Quintero, CC BY 3.0, via Wikimedia Commons",
  },
  traffic: {
    href: "/showcase/traffic.mp4",
    title: "Link Road, Cuttack",
    credit: "Subhashish Panigrahi, CC BY-SA 3.0, via Wikimedia Commons",
  },
  accident: {
    href: "/showcase/road.mp4",
    title: "Truck collision on the A1",
    credit: "CaughtOnDashcamOrCCTV, CC BY 3.0, via Wikimedia Commons",
  },
  movement: {
    href: "/showcase/crowd.mp4",
    title: "Sabana Grande boulevard",
    credit: "Vicente Quintero, CC BY 3.0, via Wikimedia Commons",
  },
  plate: {
    href: "/showcase/traffic.mp4",
    title: "Link Road, Cuttack",
    credit: "Subhashish Panigrahi, CC BY-SA 3.0, via Wikimedia Commons",
  },
};

export function departmentById(id: DepartmentId): Department {
  const found = DEPARTMENTS.find((department) => department.id === id);
  if (!found) throw new Error(`Unknown department ${id}`);
  return found;
}
