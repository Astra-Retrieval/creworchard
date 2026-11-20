"use client";

import { useActionState, useState } from "react";
import { closeAccount } from "./actions";

export function CloseAccount() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(closeAccount, { status: "idle" as const });

  if (!open) {
    return (
      <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
        Close account
      </button>
    );
  }

  return (
    <form action={action} className="form card" style={{ borderColor: "color-mix(in srgb, var(--flare-coral) 45%, var(--hull))" }}>
      <p className="eyebrow" style={{ color: "var(--flare-coral)", margin: 0 }}>Abort sequence</p>
      <p style={{ margin: 0 }}>
        This cancels your subscription before any charge, releases your early-bird price, and
        permanently deletes your account. It can&apos;t be undone.
      </p>
      <div className="field">
        <label htmlFor="confirm">Type CLOSE to confirm</label>
        <input id="confirm" name="confirm" type="text" autoComplete="off" />
      </div>
      {state.status === "error" && <div className="notice notice-error" role="alert">{state.message}</div>}
      <div className="row">
        <button className="btn btn-danger" disabled={pending}>{pending ? "Closing…" : "Close my account"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Keep my seat</button>
      </div>
    </form>
  );
}
