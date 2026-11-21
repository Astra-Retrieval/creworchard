"use client";

import { projectRoleLabel } from "@/lib/project-rules";
import type { Person } from "@/lib/workspace-types";

export const personName = (p: Person) => p.full_name || p.email;

/** A checklist of people, used when assigning them to a sub-system or integration. */
export function PeopleChecklist({
  people,
  selected,
  onToggle,
  idPrefix,
  empty,
}: {
  people: Person[];
  selected: string[];
  onToggle: (userId: string) => void;
  idPrefix: string;
  empty: string;
}) {
  if (people.length === 0) return <p className="hint">{empty}</p>;
  return (
    <ul className="ws-checklist">
      {people.map((p) => (
        <li key={p.user_id}>
          <label className="check" htmlFor={`${idPrefix}-${p.user_id}`}>
            <input
              id={`${idPrefix}-${p.user_id}`}
              type="checkbox"
              checked={selected.includes(p.user_id)}
              onChange={() => onToggle(p.user_id)}
            />
            <span>
              <span style={{ color: "var(--starlight)" }}>{personName(p)}</span>
              <span className="muted"> · {projectRoleLabel(p.role)}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** People with their role and a mail link: the "contact info" list. */
export function ContactList({ people, onRemove }: { people: Person[]; onRemove?: (userId: string) => void }) {
  return (
    <ul className="ws-contacts">
      {people.map((p) => (
        <li key={p.user_id}>
          <div style={{ minWidth: 0 }}>
            <div className="ws-contact-name">{p.full_name || "No name yet"}</div>
            <a className="ws-contact-mail" href={`mailto:${p.email}`}>{p.email}</a>
            <div className="ws-contact-role">{projectRoleLabel(p.role)}</div>
          </div>
          {onRemove && (
            <button type="button" className="ws-text-btn" onClick={() => onRemove(p.user_id)} aria-label={`Take ${personName(p)} off`}>
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export const toggleId = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
