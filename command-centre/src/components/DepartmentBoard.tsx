import { DEPARTMENTS, MODULES } from "../catalog";
import type { DepartmentId } from "../catalog";
import type { ModelHealth } from "../analyzeClient";
import type { ModelId } from "../pipeline/types";

export function DepartmentBoard({
  health,
  summaries,
  onOpen,
}: {
  health: ModelHealth | null;
  summaries: Partial<Record<ModelId, string>>;
  onOpen: (departmentId: DepartmentId, moduleId: ModelId) => void;
}) {
  const service = health?.ready
    ? `Model service ready · ${health.detector} · ${health.device}`
    : "Model service is not running. Start it with python -m cityvigilance.server";

  return (
    <main className="board">
      <header className="board-intro">
        <h2>Departments</h2>
        <p>
          Each department opens its own module. A showcase clip is already loaded for crowd, traffic, and a road collision. Open the module, load that clip, and run it. You can also choose a video of your own.
        </p>
        <p className="service" data-ready={health?.ready ? "yes" : "no"}>
          {service}
        </p>
      </header>
      <div className="dept-grid">
        {DEPARTMENTS.map((department) => (
          <article key={department.id} className="dept" aria-labelledby={`dept-${department.id}`}>
            <header>
              <p className="kicker">Department</p>
              <h3 id={`dept-${department.id}`}>{department.name}</h3>
              <p>{department.sits}</p>
            </header>
            <dl>
              <div>
                <dt>Can record</dt>
                <dd>{department.can}</dd>
              </div>
              <div>
                <dt>Stays with a person</dt>
                <dd>{department.holds}</dd>
              </div>
            </dl>
            <ul>
              {department.modules.map((moduleId) => {
                const module = MODULES[moduleId];
                return (
                  <li key={moduleId}>
                    <button type="button" className="module-open" onClick={() => onOpen(department.id, moduleId)}>
                      <span>
                        <strong>{module.title}</strong>
                        <small>{summaries[moduleId] ?? module.question}</small>
                      </span>
                      <span className="go">Open</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
