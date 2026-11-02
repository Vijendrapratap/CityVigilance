import { useState } from "react";
import { formatWhen } from "../format";
import { orderLabel } from "../pipeline/desk";
import { cameraById, displayId } from "../pipeline/sample";
import type { Order } from "../pipeline/types";

export function OutcomeLog({
  orders,
  incidentCameras,
  selectedId,
  onOpen,
  onReset,
}: {
  orders: Order[];
  incidentCameras: Record<string, string>;
  selectedId: string | null;
  onOpen: (incidentId: string) => void;
  onReset: () => void;
}) {
  return (
    <section className="panel log-panel" aria-label="Outcome log">
      <header className="panel-head">
        <h2>Outcome log</h2>
        <p>{orders.length === 0 ? "No orders yet" : `${orders.length} record${orders.length === 1 ? "" : "s"}`}</p>
        <ResetButton onReset={onReset} />
      </header>
      {orders.length === 0 ? (
        <p className="empty">No orders yet. Deploy police, deploy an ambulance, accept a signal plan, or dismiss an incident.</p>
      ) : (
        <ol className="log-list">
          <li className="log-row log-head" aria-hidden="true">
            <span>Recorded</span>
            <span>Incident</span>
            <span>Place</span>
            <span>Action</span>
            <span>Detail</span>
            <span />
          </li>
          {orders.map((order) => {
            const when = formatWhen(order.at);
            const camera = cameraById(incidentCameras[order.incidentId] ?? "");
            return (
              <li key={order.id} className="log-row" data-selected={selectedId === order.incidentId}>
                <span>
                  {when.time} IST
                  <small>{when.date}</small>
                </span>
                <span className="id">{displayId(order.incidentId)}</span>
                <span>{camera?.name ?? "Camera"}</span>
                <span>{orderLabel(order.action)}</span>
                <span>
                  {order.detail}
                  {order.note.trim() ? <small>{order.note}</small> : null}
                </span>
                <span>
                  <button type="button" className="ghost" onClick={() => onOpen(order.incidentId)}>
                    Open record
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="reset">
      <button type="button" className="ghost" onClick={() => (armed ? (onReset(), setArmed(false)) : setArmed(true))}>
        {armed ? "Clear log and reopen incidents" : "Reset session"}
      </button>
      {armed ? (
        <button type="button" className="ghost" onClick={() => setArmed(false)}>
          Cancel
        </button>
      ) : null}
    </div>
  );
}
