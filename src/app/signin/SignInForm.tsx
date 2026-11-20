"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, { status: "idle" as const });
  return (
    <form action={action} className="form card" noValidate>
      <div className="field">
        <label htmlFor="s-email">Email</label>
        <input id="s-email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="s-pass">Password</label>
        <input id="s-pass" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.status === "error" && (
        <div className="notice notice-error" role="alert">{state.message}</div>
      )}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Establishing link…" : "Sign in"}
      </button>
    </form>
  );
}
