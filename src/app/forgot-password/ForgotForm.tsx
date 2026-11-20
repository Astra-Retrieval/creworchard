"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, { status: "idle" as const });
  if (state.status === "success") {
    return <div className="notice notice-success" role="status">{state.message}</div>;
  }
  return (
    <form action={action} className="form card" noValidate>
      <div className="field">
        <label htmlFor="f-email">Email</label>
        <input id="f-email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.status === "error" && <div className="notice notice-error" role="alert">{state.message}</div>}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}
