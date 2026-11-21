"use client";

import { useActionState } from "react";
import { PROJECT_ROLES } from "@/lib/project-rules";
import type { FormState } from "@/app/waitlist/actions";

/** Adds someone from the organization to a project's team, with a role. */
export function AddToTeamForm({
  action,
  candidates,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  candidates: { user_id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" as const });

  if (candidates.length === 0) {
    return <p>Everyone in the organization is already on this project. Assign more seats on the organization page to add others.</p>;
  }

  return (
    <form action={formAction} className="form" style={{ gap: 12 }}>
      <div className="ws-team-add">
        <div className="field">
          <label htmlFor="team-person">Person</label>
          <select id="team-person" name="user_id" defaultValue="" required>
            <option value="" disabled>Choose a person…</option>
            {candidates.map((c) => <option key={c.user_id} value={c.user_id}>{c.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="team-role">Role</label>
          <select id="team-role" name="role" defaultValue="contributor">
            {PROJECT_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add to project"}</button>
      </div>
      {state.status === "error" && <div className="notice notice-error" role="alert">{state.message}</div>}
      {state.status === "success" && <div className="notice notice-success" role="status">{state.message}</div>}
    </form>
  );
}
