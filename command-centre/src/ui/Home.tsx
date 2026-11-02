import { useState } from "react";
import { Mark } from "./Mark";

export function Home({ onOpen }: { onOpen: (view: "monitor" | "traffic") => void }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  return (
    <main
      className="home"
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setOffset({
          x: (event.clientX - box.left) / box.width - 0.5,
          y: (event.clientY - box.top) / box.height - 0.5,
        });
      }}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
    >
      <div
        className="home-lockup"
        style={{ transform: `translate(${offset.x * 10}px, ${offset.y * 8}px)` }}
      >
        <Mark dx={offset.x} dy={offset.y} />
        <p className="eyebrow">Control room</p>
        <h1>City Vigilance</h1>
        <p className="home-line">Cameras stay up. An alert brings one screen forward.</p>
      </div>
      <nav className="doors" aria-label="Sections">
        <button type="button" onClick={() => onOpen("monitor")}>
          <span>01</span>
          <span>
            <strong>Monitor</strong>
            <small>The camera wall. A crash, a gathering, a watchlist, a plate, or a red light takes that screen.</small>
          </span>
          <i aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onOpen("traffic")}>
          <span>02</span>
          <span>
            <strong>Traffic control</strong>
            <small>Equal rotation beside an AI plan, on the same junction, so the difference is visible.</small>
          </span>
          <i aria-hidden="true" />
        </button>
      </nav>
    </main>
  );
}
