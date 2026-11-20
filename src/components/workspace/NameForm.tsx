"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/waitlist/actions";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/**
 * A one-field form (a name, or an email) wired to a server action, with the
 * action's error or success message shown underneath. Used to create
 * organizations and projects and to add members.
 */
export function NameForm({
  action,
  label,
  submitLabel,
  pendingLabel,
  name = "name",
  type = "text",
  defaultValue = "",
  placeholder,
  hint,
  inline = false,
}: {
  action: Action;
  label: string;
  submitLabel: string;
  pendingLabel: string;
  name?: string;
  type?: "text" | "email";
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  inline?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" as const });
  const id = `nf-${name}-${label.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <form action={formAction} className="form" style={{ gap: 12 }}>
      <div className={inline ? "inline-form" : "form"} style={inline ? undefined : { gap: 12 }}>
        <div className="field">
          <label htmlFor={id}>{label}</label>
          <input
            id={id}
            name={name}
            type={type}
            defaultValue={defaultValue}
            placeholder={placeholder}
            maxLength={type === "email" ? 254 : 120}
            required
          />
        </div>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
      {hint && state.status === "idle" && <p className="hint">{hint}</p>}
      {state.status === "error" && <div className="notice notice-error" role="alert">{state.message}</div>}
      {state.status === "success" && <div className="notice notice-success" role="status">{state.message}</div>}
    </form>
  );
}
