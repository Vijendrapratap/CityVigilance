import { useEffect, useState, type ReactNode } from "react";
import { formatWhen } from "../format";
import { Mark } from "./Mark";

export function Chrome({
  title,
  onHome,
  children,
}: {
  title: string;
  onHome: () => void;
  children?: ReactNode;
}) {
  const clock = useClock();
  return (
    <header className="chrome">
      <button type="button" className="brand" onClick={onHome}>
        <Mark size={22} />
        <span>City Vigilance</span>
      </button>
      <p className="chrome-title">{title}</p>
      <div className="chrome-tools">{children}</div>
      <p className="chrome-clock">
        <span>{clock.time} IST</span>
        <small>{clock.date}</small>
      </p>
    </header>
  );
}

function useClock() {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return formatWhen(now);
}
