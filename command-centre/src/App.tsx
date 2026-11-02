import { useState } from "react";
import { Home } from "./ui/Home";
import { Monitor } from "./ui/Monitor";
import { TrafficControl } from "./ui/TrafficControl";

type View = "home" | "monitor" | "traffic";

export function App() {
  const [view, setView] = useState<View>("home");
  return (
    <div className="cv">
      {view === "home" ? <Home onOpen={setView} /> : null}
      {view === "monitor" ? <Monitor onHome={() => setView("home")} /> : null}
      {view === "traffic" ? <TrafficControl onHome={() => setView("home")} /> : null}
    </div>
  );
}
