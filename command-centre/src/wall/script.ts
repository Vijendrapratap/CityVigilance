export type AlertKind = "accident" | "gathering" | "weapon" | "watchlist" | "redlight" | "plate";

export type AlertAction = "police" | "ambulance" | "flag" | "review";

export type WallAlert = {
  kind: AlertKind;
  title: string;
  detail: string;
  action: AlertAction;
  actionLabel: string;
};

export type WallCamera = {
  id: string;
  code: string;
  name: string;
  clip: string;
  credit: string;
  alerts: WallAlert[];
  watchBox?: boolean;
  fit: "cover" | "contain";
};

export const SEVERITY: AlertKind[] = ["accident", "gathering", "watchlist", "redlight", "weapon", "plate"];

export const ALERT_LABEL: Record<AlertKind, string> = {
  accident: "Accident",
  gathering: "Gathering",
  weapon: "Possible weapon",
  watchlist: "Watchlist",
  redlight: "Red light",
  plate: "Plate",
};

export const CAMERAS: WallCamera[] = [
  {
    id: "cam-approach",
    code: "CAM-01",
    name: "Approach",
    clip: "/showcase/approach.mp4",
    credit: "Subhashish Panigrahi, CC BY-SA 3.0, via Wikimedia Commons",
    alerts: [],
    fit: "cover",
  },
  {
    id: "cam-crossing",
    code: "CAM-02",
    name: "Crossing",
    clip: "/showcase/gathering.mp4",
    credit: "Basile Morin, CC BY-SA 4.0, via Wikimedia Commons",
    fit: "cover",
    alerts: [
      {
        kind: "gathering",
        title: "Sudden grouping",
        detail: "People have filled the crossing together. This is the pattern watched during a crowd, an election, or a disturbance. A person confirms before police are recorded.",
        action: "police",
        actionLabel: "Record police",
      },
      {
        kind: "weapon",
        title: "Possible blade",
        detail: "Marked possible. Phones, tools, and ritual objects cause false matches. No weapon model is loaded on a file. The officer watches the picture.",
        action: "police",
        actionLabel: "Record police",
      },
    ],
  },
  {
    id: "cam-road",
    code: "CAM-03",
    name: "Road",
    clip: "/showcase/crash.mp4",
    credit: "CaughtOnDashcamOrCCTV, CC BY 3.0, via Wikimedia Commons",
    fit: "contain",
    alerts: [
      {
        kind: "accident",
        title: "Crash",
        detail: "This camera is brought forward so the picture can be judged. Record ambulance keeps the order on this screen. It does not call 112.",
        action: "ambulance",
        actionLabel: "Record ambulance",
      },
    ],
  },
  {
    id: "cam-signal",
    code: "CAM-04",
    name: "Stop line",
    clip: "/showcase/signal.mp4",
    credit: "Subhashish Panigrahi, CC BY-SA 3.0, via Wikimedia Commons",
    fit: "cover",
    alerts: [
      {
        kind: "redlight",
        title: "Red signal passed",
        detail: "Demo story: a vehicle entered on red. No signal feed is connected, so this is not a measured violation.",
        action: "review",
        actionLabel: "Record review",
      },
      {
        kind: "plate",
        title: "DL01CV0001",
        detail: "On the complaint list. Demo complaint on file. This is not a real registration. Flagging it does not stop a vehicle.",
        action: "flag",
        actionLabel: "Flag plate",
      },
    ],
  },
  {
    id: "cam-ground",
    code: "CAM-05",
    name: "Ground",
    clip: "/showcase/crowd.mp4",
    credit: "Vicente Quintero, CC BY 3.0, via Wikimedia Commons",
    fit: "cover",
    watchBox: true,
    alerts: [
      {
        kind: "watchlist",
        title: "Watchlist CV-104",
        detail: "The box shows where a face match would be marked. No face model is running, and CV-104 is not a real person. A person confirms before police are recorded.",
        action: "police",
        actionLabel: "Record police",
      },
    ],
  },
];

export const FOCUS_CAMERA = "cam-road";

export function cameraById(id: string): WallCamera | undefined {
  return CAMERAS.find((camera) => camera.id === id);
}

export function primaryAlert(alerts: WallAlert[]): WallAlert | null {
  for (const kind of SEVERITY) {
    const found = alerts.find((alert) => alert.kind === kind);
    if (found) return found;
  }
  return null;
}

export function toneOf(alerts: WallAlert[]): AlertKind | null {
  return primaryAlert(alerts)?.kind ?? null;
}
