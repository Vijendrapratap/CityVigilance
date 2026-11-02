import { useEffect, useMemo, useState } from "react";
import { modelHealth, type AnalyzeResult, type ModelHealth } from "./analyzeClient";
import { MODULES, type DepartmentId } from "./catalog";
import { DepartmentBoard } from "./components/DepartmentBoard";
import { DeskScreen } from "./components/DeskScreen";
import { ModuleStudio } from "./components/ModuleStudio";
import type { ModelEvent, ModelId } from "./pipeline/types";

type View = { name: "departments" } | { name: "module"; departmentId: DepartmentId; moduleId: ModelId } | { name: "desk" };

type Clip = { url: string; name: string };

export function App() {
  const [view, setView] = useState<View>({ name: "departments" });
  const [health, setHealth] = useState<ModelHealth | null>(null);
  const [localByCamera, setLocalByCamera] = useState<Record<string, ModelEvent[]>>({});
  const [clips, setClips] = useState<Record<string, Clip>>({});
  const [files, setFiles] = useState<Partial<Record<ModelId, File>>>({});
  const [results, setResults] = useState<Partial<Record<ModelId, AnalyzeResult>>>({});
  const [focusCameraId, setFocusCameraId] = useState<string | null>(null);
  const localEvents = useMemo(() => Object.values(localByCamera).flat(), [localByCamera]);
  const summaries = useMemo(() => {
    const next: Partial<Record<ModelId, string>> = {};
    for (const [id, result] of Object.entries(results) as [ModelId, AnalyzeResult][]) next[id] = result.summary;
    return next;
  }, [results]);

  useEffect(() => {
    let alive = true;
    void modelHealth().then((next) => {
      if (alive) setHealth(next);
    });
    return () => {
      alive = false;
    };
  }, [view.name]);

  function rememberFile(moduleId: ModelId, file: File) {
    const cameraId = MODULES[moduleId].cameraId;
    setFiles((prev) => ({ ...prev, [moduleId]: file }));
    setClips((prev) => {
      const previous = prev[cameraId];
      if (previous) URL.revokeObjectURL(previous.url);
      return { ...prev, [cameraId]: { url: URL.createObjectURL(file), name: file.name } };
    });
  }

  function rememberResult(moduleId: ModelId, result: AnalyzeResult) {
    const cameraId = result.event.cameraId;
    setResults((prev) => ({ ...prev, [moduleId]: result }));
    setLocalByCamera((prev) => {
      const existing = prev[cameraId] ?? [];
      return { ...prev, [cameraId]: [...existing.filter((event) => event.model !== result.event.model), result.event] };
    });
    setFocusCameraId(cameraId);
  }

  const moduleView = view.name === "module" ? view : null;
  const moduleInfo = moduleView ? MODULES[moduleView.moduleId] : null;

  return (
    <div className={view.name === "desk" ? "app" : "app app-browse"}>
      <header className="topbar">
        <div className="brand">
          <p className="product">CityVigilance</p>
          <h1>{view.name === "desk" ? "Command centre" : "Proof of concept"}</h1>
        </div>
        <div className="slice">
          <nav className="nav" aria-label="Showcase">
            <button type="button" className="ghost" aria-pressed={view.name !== "desk"} onClick={() => setView({ name: "departments" })}>
              Departments
            </button>
            <button type="button" className="ghost" aria-pressed={view.name === "desk"} onClick={() => setView({ name: "desk" })}>
              Desk
            </button>
          </nav>
          <p>{view.name === "desk" ? "Uploaded clips replace the sample on that camera." : "One module, one clip, one department."}</p>
        </div>
        {view.name === "desk" ? null : (
          <p className="clock">
            <span>IST</span>
            <small>Desk clock is on the command view</small>
          </p>
        )}
      </header>
      {view.name === "departments" ? <DepartmentBoard health={health} summaries={summaries} onOpen={(departmentId, moduleId) => setView({ name: "module", departmentId, moduleId })} /> : null}
      {moduleView && moduleInfo ? (
        <ModuleStudio
          departmentId={moduleView.departmentId}
          moduleId={moduleView.moduleId}
          clipUrl={clips[moduleInfo.cameraId]?.url ?? null}
          clipName={clips[moduleInfo.cameraId]?.name ?? null}
          file={files[moduleView.moduleId] ?? null}
          result={results[moduleView.moduleId] ?? null}
          onBack={() => setView({ name: "departments" })}
          onFile={(file) => rememberFile(moduleView.moduleId, file)}
          onResult={(result) => rememberResult(moduleView.moduleId, result)}
          onDesk={() => setView({ name: "desk" })}
        />
      ) : null}
      {view.name === "desk" ? <DeskScreen localEvents={localEvents} clips={clips} focusCameraId={focusCameraId} /> : null}
      <footer className="footnote">
        People and vehicles are read on the CPU of this machine from the uploaded clip. Weapon and accident models are not loaded, so those modules leave the decision with the officer. City cameras, a vision API, dispatch, and a signal controller are not connected.
      </footer>
    </div>
  );
}
