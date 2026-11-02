import { useEffect, useId, useRef, useState } from "react";
import { DISMISS_REASONS } from "../pipeline/types";

export type DialogMode = "police" | "ambulance" | "signal" | "dismiss";

export function ActionDialog({
  mode,
  title,
  body,
  plan,
  onClose,
  onConfirm,
}: {
  mode: DialogMode;
  title: string;
  body: string;
  plan?: string;
  onClose: () => void;
  onConfirm: (note: string, reason?: string) => void;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState<string>(DISMISS_REASONS[0]);
  const [note, setNote] = useState("");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const items = () =>
      [...node.querySelectorAll<HTMLElement>("button, textarea, input")].filter((el) => !el.hasAttribute("disabled"));
    items()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = items();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dismissBlocked = reason === "Other" && note.trim().length === 0;
  const confirmLabel =
    mode === "police" ? "Record police order" : mode === "ambulance" ? "Record ambulance order" : mode === "signal" ? "Store signal plan" : "Dismiss incident";

  return (
    <div
      className="backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <h3 id={titleId}>{title}</h3>
        <p>{body}</p>
        {plan ? <p className="desk-line">{plan}</p> : null}
        {mode === "dismiss" ? (
          <fieldset>
            <legend>Reason</legend>
            {DISMISS_REASONS.map((item) => (
              <label key={item}>
                <input type="radio" name="dismiss-reason" checked={reason === item} onChange={() => setReason(item)} />
                {item}
              </label>
            ))}
          </fieldset>
        ) : null}
        <label className="note-label">
          Note {mode === "dismiss" && reason === "Other" ? "(required)" : "(optional)"}
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
        </label>
        <div className="dialog-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={mode === "dismiss" && dismissBlocked} onClick={() => onConfirm(note, reason)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
