/** Escapes regex metacharacters so user input can be safely used in a $regex query. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True if the string contains any ASCII control character (NUL..US, or DEL).
 * Used to reject values that would be unsafe to write verbatim into config
 * files (e.g. a newline in a Mongo URI that could inject extra .env lines).
 */
export function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}
