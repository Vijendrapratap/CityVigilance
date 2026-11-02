import { useEffect, useMemo, useReducer, useState } from "react";
import { ensureIncidents, hydrateDesk, reduceDesk, type DeskAction } from "./pipeline/desk";
import { incidentSpecs, publishFrames, runModels } from "./pipeline/sample";

const STORAGE_KEY = "cityvigilance.command.v1";

function loadDesk() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return hydrateDesk(raw ? (JSON.parse(raw) as unknown) : null);
  } catch {
    return hydrateDesk(null);
  }
}

export function useDesk() {
  const [sequence, setSequence] = useState(0);
  const [now, setNow] = useState(() => new Date().toISOString());
  const [state, dispatch] = useReducer(reduceDesk, undefined, loadDesk);

  const events = useMemo(() => runModels(publishFrames(sequence, now)).events, [sequence, now]);
  const specs = useMemo(() => incidentSpecs(events), [events]);

  useEffect(() => {
    dispatch({ type: "sync", specs, at: now });
  }, [specs, now]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSequence((value) => value + 1);
      setNow(new Date().toISOString());
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state }));
  }, [state]);

  return {
    sequence,
    now,
    events,
    state: ensureIncidents(state, specs, now),
    act: (action: Exclude<DeskAction, { type: "sync" | "reset" }>) => dispatch(action),
    reset: () => dispatch({ type: "reset", specs, at: new Date().toISOString() }),
  };
}
