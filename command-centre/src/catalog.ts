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
};

export const DEPARTMENTS: Department[] = [
  {
    id: "police",
    name: "Police",
    sits: "Officers watching a crowd camera",
    can: "Record a police order after a person confirms the clip",
    holds: "A weapon line stays a possible match. The order stays on this screen until a dispatch system is named.",
    modules: ["crowd", "weapon"],
  },
  {
    id: "traffic",
    name: "Traffic",
    sits: "The junction desk",
    can: "Accept a signal plan and store it in the outcome log",
    holds: "The plan stays advice until a signal controller is named. Queue metres are measured only when a traffic model reports metres.",
    modules: ["traffic"],
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
    holds: "Flow and panic models are later. This desk asks police through the crowd incident.",
    modules: ["crowd"],
  },
];

export const MODULES: Record<ModelId, ModuleInfo> = {
  crowd: {
    id: "crowd",
    title: "Crowd count",
    question: "How many people are in this view?",
    cameraId: "cam-crowd",
    cameraName: "Crowd camera 1",
    reads: "People the detector can separate in a frame",
  },
  weapon: {
    id: "weapon",
    title: "Weapon check",
    question: "Is there a shape like a firearm or a blade?",
    cameraId: "cam-crowd",
    cameraName: "Crowd camera 1",
    reads: "A weapon model, when one is loaded. The current detector has no weapon class.",
  },
  accident: {
    id: "accident",
    title: "Accident",
    question: "Is there a crash on this road?",
    cameraId: "cam-road",
    cameraName: "Road camera 1",
    reads: "An accident model, when one is loaded. The current detector has no crash class.",
  },
  traffic: {
    id: "traffic",
    title: "Traffic",
    question: "How many vehicles are in this view, and what green time would you store?",
    cameraId: "cam-junction",
    cameraName: "Junction camera 1",
    reads: "Bicycles, cars, motorcycles, buses, and trucks in the frame",
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
};

export function departmentById(id: DepartmentId): Department {
  const found = DEPARTMENTS.find((department) => department.id === id);
  if (!found) throw new Error(`Unknown department ${id}`);
  return found;
}
