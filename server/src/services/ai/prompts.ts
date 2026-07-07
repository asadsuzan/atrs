/**
 * Prompt templates for the shared AI assist service. Every prompt embeds the
 * caller's structured context (form fields) rather than a bare instruction, so
 * suggestions are grounded in what the user is actually filling in.
 */

/** Serialize the form context compactly, capped so a huge field can't blow the prompt. */
function contextBlock(context: unknown): string {
  let json = '{}';
  try { json = JSON.stringify(context ?? {}, null, 2); } catch { /* keep {} */ }
  return json.length > 4000 ? `${json.slice(0, 4000)}\n… (truncated)` : json;
}

/** Ask for a few distinct title options for the given entity. */
export function titlePrompt(entity: string, context: unknown): string {
  return [
    `You are helping a user write a concise, professional title for a ${entity}.`,
    'Base the titles strictly on the structured context below — do not invent facts it does not imply.',
    'Rules:',
    '- Return 3 to 5 distinct options, most fitting first.',
    '- Each is clear and specific, no trailing period, at most ~12 words.',
    '- No numbering, quotes, or surrounding text.',
    'Respond with JSON only: {"titles": string[]}',
    '',
    'Context:',
    contextBlock(context),
  ].join('\n');
}

/** Ask for a single description, grounded in the context and (optionally) the chosen title. */
export function descriptionPrompt(entity: string, context: unknown, title?: string): string {
  return [
    `You are helping a user write a clear description for a ${entity}.`,
    title ? `The chosen title is: "${title}".` : '',
    'Expand naturally on the structured context below; do not invent specifics it does not contain.',
    'Rules:',
    '- One short paragraph, 2–4 sentences.',
    '- Plain, professional tone. No markdown headings, no bullet lists.',
    'Respond with JSON only: {"description": string}',
    '',
    'Context:',
    contextBlock(context),
  ].filter(Boolean).join('\n');
}
