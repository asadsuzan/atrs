/**
 * Line-drop and regex find/replace edits for text files — used to rewrite the
 * plugin header per variant (e.g. dropping Freemius `@fs_premium_only`
 * annotations from the free build, or flipping premium flags for pro).
 */

export interface TextEditOp {
  drop?: string;
  replace?: string;
  with?: string;
  flags?: string;
}

export function applyTextEdits(content: string, ops: TextEditOp[]): string {
  let out = content;
  for (const op of ops) {
    if (op.drop != null) {
      out = out
        .split(/\r?\n/)
        .filter((line) => !line.includes(op.drop as string))
        .join('\n');
    } else if (op.replace != null) {
      out = out.replace(new RegExp(op.replace, op.flags ?? 'g'), op.with ?? '');
    }
  }
  return out;
}
