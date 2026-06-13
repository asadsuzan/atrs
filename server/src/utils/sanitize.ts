/** Escapes regex metacharacters so user input can be safely used in a $regex query. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
