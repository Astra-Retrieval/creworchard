"use client";

import { useActionState, useEffect, useState } from "react";
import { updateName } from "./actions";

/** The member's name on their crew pass, with an inline editor. */
export function EditName({ name, email }: { name: string | null; email: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateName, { status: "idle" as const });

  // Close the editor once a save succeeds; the page re-renders with the new name.
  useEffect(() => {
    if (state.status === "success") setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div style={{ display: "grid", gap: 4 }}>
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 600, fontSize: 26, lineHeight: 1.2, overflowWrap: "anywhere" }}>
            {name || <span className="muted">Add your name</span>}
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "4px 12px", fontSize: 12 }}
            onClick={() => setEditing(true)}
          >
            {name ? "Edit" : "Add name"}
          </button>
        </div>
        <div className="muted small" style={{ overflowWrap: "anywhere" }}>{email}</div>
        {state.status === "success" && (
          <div className="hint" role="status" style={{ color: "var(--mint)" }}>Name saved.</div>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="form" style={{ gap: 10 }}>
      <div className="field">
        <label htmlFor="edit-name">Your name</label>
        <input id="edit-name" name="full_name" type="text" autoComplete="name" defaultValue={name ?? ""} maxLength={120} required autoFocus />
        <p className="hint">We greet you by the first word. Emails use the full name.</p>
      </div>
      {state.status === "error" && <div className="notice notice-error" role="alert">{state.message}</div>}
      <div className="row">
        <button className="btn btn-primary" style={{ padding: "10px 20px" }} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
