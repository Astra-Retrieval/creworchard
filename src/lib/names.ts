/** Names as people type them: trimmed, single-spaced, capped at 120 characters. */
export function cleanName(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/**
 * The name to greet someone by: the first word of their saved name. Returns
 * null when no name is saved, so callers greet without a name rather than
 * falling back to part of an email address.
 */
export function firstNameOf(fullName: string | null | undefined): string | null {
  const first = cleanName(fullName).split(" ")[0];
  return first ? first : null;
}
