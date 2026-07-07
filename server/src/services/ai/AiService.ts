import { getOllamaUrl, getOllamaHeaders, getModel, KEEP_ALIVE, ollamaErrorMessage } from '../../utils/ollama';
import { titlePrompt, descriptionPrompt } from './prompts';

/**
 * Shared AI assist service used by every form's "Suggest title / Generate
 * description" actions. Provider-agnostic by design — today it drives the same
 * Ollama endpoint (local or cloud) configured for the Changelog Generator; an
 * OpenAI/Gemini provider can be slotted behind `complete()` later without
 * touching callers.
 */

/**
 * One JSON completion. Slightly non-deterministic (a little temperature, no
 * fixed seed) so repeated "Suggest" clicks offer fresh options.
 */
async function complete(prompt: string, opts: { numPredict: number; temperature: number }): Promise<any> {
  const model = getModel();
  const res = await fetch(`${getOllamaUrl()}/api/generate`, {
    method: 'POST',
    headers: getOllamaHeaders(),
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: 'json',
      keep_alive: KEEP_ALIVE,
      options: { temperature: opts.temperature, top_p: 0.9, num_predict: opts.numPredict },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(ollamaErrorMessage(res.status, body, model));
  }
  const data: any = await res.json();
  try {
    return JSON.parse(data.response);
  } catch {
    throw new Error('The AI returned an unexpected response — try again.');
  }
}

/** 3–5 title options for the given entity, grounded in the form context. */
export async function suggestTitles(entity: string, context: unknown): Promise<string[]> {
  const parsed = await complete(titlePrompt(entity, context), { numPredict: 220, temperature: 0.6 });
  const titles = Array.isArray(parsed?.titles) ? parsed.titles : [];
  return titles
    .map((t: any) => String(t || '').trim().replace(/^["']|["']$/g, '').replace(/\.$/, ''))
    .filter(Boolean)
    .slice(0, 5);
}

/** A single description paragraph for the entity, optionally guided by a chosen title. */
export async function suggestDescription(entity: string, context: unknown, title?: string): Promise<string> {
  const parsed = await complete(descriptionPrompt(entity, context, title), { numPredict: 400, temperature: 0.4 });
  return String(parsed?.description || '').trim().slice(0, 2000);
}
