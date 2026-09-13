/** Mirrors server length bounds. The server also rejects its small common-password denylist. */
export function newPasswordError(password: string): string | null {
  if (Array.from(password).length < 15) return "Use at least 15 characters.";
  if (new TextEncoder().encode(password).length > 72) return "Use at most 72 UTF-8 bytes; some characters use more than one byte.";
  return null;
}
