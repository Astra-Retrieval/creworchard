"use client";

import { useActionState } from "react";
import { updatePassword } from "./actions";

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, { status: "idle" as const });
  return (
    <form action={action} className="form card" noValidate>
      <div className="field">
        <label htmlFor="r-pass">New password</label>
        <input id="r-pass" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label htmlFor="r-confirm">Confirm new password</label>
        <input id="r-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state.status === "error" && <div className="notice notice-error" role="alert">{state.message}</div>}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
