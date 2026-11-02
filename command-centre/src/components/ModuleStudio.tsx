import { useState } from "react";
import { analyzeClip, type AnalyzeResult } from "../analyzeClient";
import { departmentById, MODULES, type DepartmentId } from "../catalog";
import type { ModelId } from "../pipeline/types";

export function ModuleStudio({
  departmentId,
  moduleId,
  clipUrl,
  clipName,
  file,
  result,
  onBack,
  onFile,
  onResult,
  onDesk,
}: {
  departmentId: DepartmentId;
  moduleId: ModelId;
  clipUrl: string | null;
  clipName: string | null;
  file: File | null;
  result: AnalyzeResult | null;
  onBack: () => void;
  onFile: (file: File) => void;
  onResult: (result: AnalyzeResult) => void;
  onDesk: () => void;
}) {
  const department = departmentById(departmentId);
  const module = MODULES[moduleId];
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choose(next: File | null) {
    if (!next) return;
    setError(null);
    onFile(next);
  }

  async function run() {
    if (!file) return;
    setRunning(true);
    setError(null);
    try {
      onResult(await analyzeClip(moduleId, file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The model service did not read this clip.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="studio">
      <aside className="brief">
        <button type="button" className="ghost back" onClick={onBack}>
          All departments
        </button>
        <p className="kicker">{department.name}</p>
        <h2>{module.title}</h2>
        <p className="question">{module.question}</p>
        <dl>
          <div>
            <dt>Who is watching</dt>
            <dd>{department.sits}</dd>
          </div>
          <div>
            <dt>Camera</dt>
            <dd>{module.cameraName}</dd>
          </div>
          <div>
            <dt>This model reads</dt>
            <dd>{module.reads}</dd>
          </div>
          <div>
            <dt>Can record</dt>
            <dd>{department.can}</dd>
          </div>
          <div>
            <dt>Stays with a person</dt>
            <dd>{department.holds}</dd>
          </div>
        </dl>
      </aside>
      <section className="stage" aria-label="Clip">
        <header className="panel-head">
          <h2>Clip</h2>
          <p>{clipName ?? "No clip yet"}</p>
        </header>
        {clipUrl ? (
          <video className="clip" src={clipUrl} controls playsInline />
        ) : (
          <p className="drop-hint">Upload a short clip for this use case. About one frame a second is sent to the model, up to 12 frames.</p>
        )}
        <label className="upload">
          Choose a video
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            onChange={(event) => choose(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="button" disabled={!file || running} onClick={() => void run()}>
          {running ? "Reading the clip…" : "Run this module"}
        </button>
        {error ? <p className="run-error">{error}</p> : null}
      </section>
      <aside className="result-card" aria-live="polite">
        <header className="panel-head">
          <h2>Result</h2>
          <p>{result ? "From this clip" : "Waiting for a run"}</p>
        </header>
        {result ? <ResultBody result={result} /> : <p className="empty">Run the module to fill this panel. The sample desk keeps its own numbers until a clip is placed.</p>}
        <button type="button" className="ghost" disabled={!result} onClick={onDesk}>
          Open on the desk
        </button>
      </aside>
    </main>
  );
}

function ResultBody({ result }: { result: AnalyzeResult }) {
  const { event } = result;
  const finding = event.finding;
  return (
    <div className="finding">
      {finding.type === "crowd" ? (
        <p className="count-hero">
          {finding.count} <span>people</span>
        </p>
      ) : null}
      {finding.type === "weapon" ? <p className="count-hero">Not decided</p> : null}
      {finding.type === "accident" ? <p className="count-hero">{finding.crash ? "Crash" : "Not decided"}</p> : null}
      {finding.type === "traffic" ? (
        <p className="count-hero">
          {finding.arms[0]?.vehicles ?? 0} <span>vehicles</span>
        </p>
      ) : null}
      <p className="sample-note">{event.note}</p>
      <p className="quiet-line">
        {event.detector ? `${event.detector} · ` : ""}
        {event.device ?? "cpu"} · source {event.source}
      </p>
    </div>
  );
}
