import { z } from 'zod';
import { OllamaProvider } from '../../providers/OllamaProvider';
import type { LLMProvider } from '../../providers/LLMProvider';

/**
 * The only sanctioned way for the intelligence layer to call a language model.
 *
 * Three rules are enforced here rather than trusted to prompt wording:
 *
 *  1. **Schema validation.** Output is parsed with Zod. A response that doesn't
 *     match is rejected and retried with the validation error fed back, not
 *     patched up with `|| 'default'` fallbacks — which is how the previous
 *     implementation turned malformed responses into confident-looking insights.
 *
 *  2. **Citation grounding.** When the caller supplies an allow-list of evidence
 *     ids, every id the model cites must be in it. A model that invents a signal
 *     reference has invented the reasoning behind it, so the whole response is
 *     discarded.
 *
 *  3. **No silent success.** After the retry budget the runner returns
 *     `{ data: null }`. Callers are expected to fall back to a deterministic
 *     narrative, so the feature degrades to plainer language instead of to
 *     fiction.
 */

/** Task classes with different creativity tolerances. */
export type TaskClass = 'analytical' | 'explanatory' | 'creative';

/**
 * Temperature by task class. Analytical work (prioritisation, readiness gates)
 * must be reproducible run-to-run; only copywriting benefits from variety.
 */
const TEMPERATURE: Record<TaskClass, number> = {
  analytical: 0.1,
  explanatory: 0.3,
  creative: 0.7,
};

export interface RunOptions<T> {
  /** Short identifier used in logs, e.g. 'insight.narrative'. */
  task: string;
  schema: z.ZodType<T>;
  /** Role and rules. */
  system: string;
  /** The grounded facts and the request. */
  user: string;
  taskClass?: TaskClass;
  /**
   * Evidence ids the model is permitted to cite. When set, the response must
   * carry a `citations` array and every entry must appear here.
   */
  allowedCitations?: string[];
  /** Minimum citations required for the response to be accepted. */
  minCitations?: number;
  maxRetries?: number;
  numPredict?: number;
}

export interface RunResult<T> {
  data: T | null;
  attempts: number;
  /** Why each attempt was rejected — surfaced so failures are diagnosable. */
  rejections: string[];
  /** True when no attempt produced a valid response. */
  failed: boolean;
}

/** Anything carrying citations; the runner checks them without knowing the rest. */
interface MaybeCited {
  citations?: unknown;
}

export class PromptRunner {
  private static provider: LLMProvider = new OllamaProvider();

  /** Swappable for tests and for future non-Ollama providers. */
  static setProvider(provider: LLMProvider): void {
    this.provider = provider;
  }

  /**
   * Probes the provider with a trivial generation.
   *
   * `OllamaProvider.isAvailable()` hardcodes `true`, which meant every caller
   * "checked" availability and then failed at the network call. A real probe
   * lets callers choose the deterministic path before wasting a retry budget.
   */
  static async probe(): Promise<{ available: boolean; error?: string }> {
    try {
      const res = await this.provider.generate('Reply with the single word: ok', {
        numPredict: 8,
        temperature: 0,
      });
      return { available: typeof res === 'string' && res.length > 0 };
    } catch (error) {
      return { available: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  static async run<T>(opts: RunOptions<T>): Promise<RunResult<T>> {
    const maxRetries = opts.maxRetries ?? 2;
    const temperature = TEMPERATURE[opts.taskClass ?? 'explanatory'];
    const rejections: string[] = [];

    let prompt = `${opts.system}\n\n${opts.user}`;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      let raw: string;
      try {
        raw = await this.provider.generate(prompt, {
          format: 'json',
          // Nudge temperature up slightly on retries: a model that produced
          // malformed output at T=0.1 will often reproduce it verbatim.
          temperature: attempt === 1 ? temperature : Math.min(0.6, temperature + 0.2 * (attempt - 1)),
          numPredict: opts.numPredict ?? 900,
        });
      } catch (error) {
        rejections.push(`attempt ${attempt}: provider error — ${error instanceof Error ? error.message : String(error)}`);
        // A provider that's down will stay down for the next attempt; don't burn the budget.
        break;
      }

      const parsed = extractJson(raw);
      if (parsed === null) {
        rejections.push(`attempt ${attempt}: response was not parseable JSON`);
        prompt = `${opts.system}\n\n${opts.user}\n\nYour previous reply was not valid JSON. Reply with a single JSON object and nothing else.`;
        continue;
      }

      const result = opts.schema.safeParse(parsed);
      if (!result.success) {
        const detail = result.error.issues
          .slice(0, 6)
          .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('; ');
        rejections.push(`attempt ${attempt}: schema mismatch — ${detail}`);
        prompt = `${opts.system}\n\n${opts.user}\n\nYour previous reply did not match the required structure. Errors: ${detail}. Reply with corrected JSON only.`;
        continue;
        
      }

      const citationError = this.checkCitations(result.data as MaybeCited, opts);
      if (citationError) {
        rejections.push(`attempt ${attempt}: ${citationError}`);
        prompt =
          `${opts.system}\n\n${opts.user}\n\nYour previous reply cited evidence that does not exist. ${citationError} ` +
          `You may only cite these ids: ${(opts.allowedCitations ?? []).join(', ')}. Reply with corrected JSON only.`;
        continue;
      }

      return { data: result.data, attempts: attempt, rejections, failed: false };
    }

    console.warn(`[PromptRunner] ${opts.task} failed after ${rejections.length} attempt(s):`, rejections);
    return { data: null, attempts: rejections.length, rejections, failed: true };
  }

  /**
   * Verifies the response only cites evidence we actually handed it.
   *
   * This is the single most important check in the file. A narrative that cites
   * `bug.critical_open` when no such signal fired is not a formatting problem —
   * it means the model reasoned from something it made up, and nothing else in
   * that response can be trusted either.
   */
  private static checkCitations<T>(data: MaybeCited, opts: RunOptions<T>): string | null {
    if (!opts.allowedCitations) return null;

    const cited = Array.isArray(data.citations) ? data.citations.map((c) => String(c)) : [];
    const minimum = opts.minCitations ?? 1;

    if (cited.length < minimum) {
      return `expected at least ${minimum} citation(s) but got ${cited.length}`;
    }

    const allowed = new Set(opts.allowedCitations);
    const unknown = cited.filter((c) => !allowed.has(c));
    if (unknown.length > 0) {
      return `cited unknown evidence ids: ${unknown.join(', ')}`;
    }

    return null;
  }
}

/**
 * Recovers a JSON object from a model response.
 *
 * Even with `format: 'json'` set, local models wrap output in markdown fences or
 * prepend a sentence of preamble often enough that a bare `JSON.parse` throws
 * away otherwise-good responses.
 */
export function extractJson(raw: string): unknown | null {
  if (!raw) return null;

  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through to brace matching.
  }

  // Scan for the first balanced {...} or [...], respecting strings and escapes so
  // a brace inside a narrative string can't truncate the match.
  //
  // Whichever bracket opens first wins. Trying `{` unconditionally first would
  // reduce a prose-prefixed array response ("Here you go: [{...},{...}]") to just
  // its first element, silently dropping the rest.
  const candidates = ([
    ['{', '}'],
    ['[', ']'],
  ] as const)
    .map(([open, close]) => ({ open, close, start: cleaned.indexOf(open) }))
    .filter((c) => c.start !== -1)
    .sort((a, b) => a.start - b.start);

  for (const { open, close, start } of candidates) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(cleaned.slice(start, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }

  return null;
}
