import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { PromptRunner, extractJson } from '../../services/intelligence/llm/PromptRunner';
import type { GenerateOptions, LLMProvider } from '../../services/providers/LLMProvider';

/**
 * Tests for the only sanctioned path to a language model.
 *
 * Two guarantees are enforced here rather than trusted to prompt wording: a
 * response must match its schema, and it may only cite evidence ids we actually
 * supplied. The second is the anti-hallucination core — a narrative citing a
 * signal that never fired reasoned from something the model invented, so the
 * whole response is discarded rather than partially salvaged.
 */

/** A provider that replays a fixed script of responses, one per attempt. */
class ScriptedProvider implements LLMProvider {
  readonly prompts: string[] = [];
  private index = 0;

  constructor(private readonly responses: Array<string | Error>) {}

  isAvailable(): boolean {
    return true;
  }

  async generate(prompt: string, _options?: GenerateOptions): Promise<string> {
    this.prompts.push(prompt);
    const next = this.responses[Math.min(this.index, this.responses.length - 1)];
    this.index++;
    if (next instanceof Error) throw next;
    return next;
  }

  async embed(): Promise<number[]> {
    return [];
  }

  get callCount(): number {
    return this.index;
  }
}

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses a markdown-fenced json block', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('parses an unlabelled fenced block', () => {
    expect(extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('parses JSON preceded by prose', () => {
    // Local models prepend a sentence often enough that a bare JSON.parse would
    // discard otherwise-good responses.
    expect(extractJson('Sure! Here is the JSON you asked for:\n{"a":1}')).toEqual({ a: 1 });
  });

  it('parses JSON followed by prose', () => {
    expect(extractJson('{"a":1}\nLet me know if you need anything else.')).toEqual({ a: 1 });
  });

  it('does not truncate at a brace inside a string value', () => {
    // The brace-matching scanner has to respect string boundaries. Truncating at
    // the inner `}` would fail the parse and burn a retry on a valid response.
    const raw = 'Here you go: {"narrative": "we use {curly} braces"}';
    expect(extractJson(raw)).toEqual({ narrative: 'we use {curly} braces' });
  });

  it('does not truncate at an escaped quote before a brace', () => {
    const raw = 'Result: {"narrative": "she said \\"use {this}\\" today"}';
    expect(extractJson(raw)).toEqual({ narrative: 'she said "use {this}" today' });
  });

  it('handles nested objects', () => {
    expect(extractJson('Note: {"outer":{"inner":{"deep":true}}} done')).toEqual({
      outer: { inner: { deep: true } },
    });
  });

  it('parses arrays', () => {
    expect(extractJson('[1,2,3]')).toEqual([1, 2, 3]);
    // Whichever bracket opens first wins. Scanning for `{` unconditionally first
    // would return only `{"a":1}` here, silently discarding the rest of a
    // perfectly valid array response.
    expect(extractJson('Here: [{"a":1},{"a":2}]')).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('returns null for genuinely unparseable input', () => {
    expect(extractJson('')).toBeNull();
    expect(extractJson('I cannot help with that request.')).toBeNull();
    // A truncated object must not be repaired into something plausible.
    expect(extractJson('{"a": 1, "b":')).toBeNull();
    expect(extractJson('{not json at all}')).toBeNull();
  });
});

describe('PromptRunner.run', () => {
  const schema = z.object({
    narrative: z.string(),
    citations: z.array(z.string()),
  });

  const baseOptions = {
    task: 'test.narrative',
    schema,
    system: 'You are a test.',
    user: 'Explain the signals.',
    allowedCitations: ['bug.critical_open', 'release.dormant'],
  };

  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // The runner logs a warning on final failure; keep the test output readable.
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
    // Static provider state leaks between tests otherwise.
    PromptRunner.setProvider(new ScriptedProvider(['{}']));
  });

  it('accepts a response that cites only allowed evidence', async () => {
    const provider = new ScriptedProvider([
      JSON.stringify({ narrative: 'The product has an open critical bug.', citations: ['bug.critical_open'] }),
    ]);
    PromptRunner.setProvider(provider);

    const result = await PromptRunner.run(baseOptions);

    expect(result.failed).toBe(false);
    expect(result.data).toEqual({
      narrative: 'The product has an open critical bug.',
      citations: ['bug.critical_open'],
    });
    expect(result.attempts).toBe(1);
    expect(result.rejections).toEqual([]);
  });

  it('rejects a response citing an id that is not in allowedCitations', async () => {
    const provider = new ScriptedProvider([
      JSON.stringify({
        narrative: 'Installs are collapsing because of the licensing signal.',
        citations: ['bug.critical_open', 'licence.expired_keys'],
      }),
    ]);
    PromptRunner.setProvider(provider);

    const result = await PromptRunner.run(baseOptions);

    // The core anti-hallucination guarantee: an invented citation means the
    // reasoning behind the whole narrative was invented, so nothing survives.
    // Note that one *valid* citation is present and still does not save it.
    expect(result.failed).toBe(true);
    expect(result.data).toBeNull();
    expect(result.rejections.join(' ')).toContain('cited unknown evidence ids: licence.expired_keys');
    // It retried the full budget before giving up: 1 initial + 2 retries.
    expect(provider.callCount).toBe(3);
  });

  it('tells the model exactly which ids it may cite when retrying', async () => {
    const provider = new ScriptedProvider([
      JSON.stringify({ narrative: 'x', citations: ['made.up'] }),
    ]);
    PromptRunner.setProvider(provider);

    await PromptRunner.run(baseOptions);

    expect(provider.prompts[1]).toContain('bug.critical_open, release.dormant');
    expect(provider.prompts[1]).toContain('cited evidence that does not exist');
  });

  it('rejects a response with no citations when citations are required', async () => {
    const provider = new ScriptedProvider([JSON.stringify({ narrative: 'Trust me.', citations: [] })]);
    PromptRunner.setProvider(provider);

    const result = await PromptRunner.run(baseOptions);

    // An uncited claim is indistinguishable from a fabricated one.
    expect(result.failed).toBe(true);
    expect(result.rejections.join(' ')).toContain('expected at least 1 citation(s) but got 0');
  });

  it('honours a higher minCitations', async () => {
    const provider = new ScriptedProvider([
      JSON.stringify({ narrative: 'One source only.', citations: ['bug.critical_open'] }),
    ]);
    PromptRunner.setProvider(provider);

    const result = await PromptRunner.run({ ...baseOptions, minCitations: 2 });

    expect(result.failed).toBe(true);
    expect(result.rejections.join(' ')).toContain('expected at least 2 citation(s) but got 1');
  });

  it('skips citation checking when no allow-list is supplied', async () => {
    const provider = new ScriptedProvider([JSON.stringify({ narrative: 'No citations needed.', citations: [] })]);
    PromptRunner.setProvider(provider);

    const result = await PromptRunner.run({ ...baseOptions, allowedCitations: undefined });

    expect(result.failed).toBe(false);
    expect(result.data?.narrative).toBe('No citations needed.');
  });

  it('recovers a valid response on a later attempt', async () => {
    const provider = new ScriptedProvider([
      'not json at all',
      JSON.stringify({ narrative: 'Second time lucky.', citations: ['release.dormant'] }),
    ]);
    PromptRunner.setProvider(provider);

    const result = await PromptRunner.run(baseOptions);

    expect(result.failed).toBe(false);
    expect(result.attempts).toBe(2);
    // The rejection is retained even on success, so a flaky provider is visible.
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0]).toContain('not parseable JSON');
  });

  it('retries a schema-mismatched response and then fails', async () => {
    const provider = new ScriptedProvider([JSON.stringify({ narrative: 42, citations: ['bug.critical_open'] })]);
    PromptRunner.setProvider(provider);

    const result = await PromptRunner.run(baseOptions);

    // No `|| 'default'` patching: a malformed response is never turned into a
    // confident-looking insight, it just fails and the caller falls back to
    // deterministic prose.
    expect(result.data).toBeNull();
    expect(result.failed).toBe(true);
    expect(provider.callCount).toBe(3);
    expect(result.rejections).toHaveLength(3);
    expect(result.rejections[0]).toContain('schema mismatch');
    // The validation error is fed back rather than discarded.
    expect(provider.prompts[1]).toContain('did not match the required structure');
  });

  it('respects a custom retry budget', async () => {
    const provider = new ScriptedProvider(['garbage']);
    PromptRunner.setProvider(provider);

    await PromptRunner.run({ ...baseOptions, maxRetries: 0 });

    expect(provider.callCount).toBe(1);
  });

  it('stops immediately on a provider error instead of burning the budget', async () => {
    const provider = new ScriptedProvider([new Error('ECONNREFUSED')]);
    PromptRunner.setProvider(provider);

    const result = await PromptRunner.run(baseOptions);

    // A provider that is down will still be down next attempt.
    expect(provider.callCount).toBe(1);
    expect(result.failed).toBe(true);
    expect(result.rejections[0]).toContain('provider error — ECONNREFUSED');
  });

  it('asks for JSON output and uses a low temperature for analytical tasks', async () => {
    const generate = vi.fn<(prompt: string, options?: GenerateOptions) => Promise<string>>(async () =>
      JSON.stringify({ narrative: 'ok', citations: ['release.dormant'] }),
    );
    PromptRunner.setProvider({ isAvailable: () => true, generate, embed: async () => [] });

    await PromptRunner.run({ ...baseOptions, taskClass: 'analytical' });

    // Prioritisation output has to be reproducible run to run, so creativity is
    // dialled all the way down for analytical work.
    expect(generate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ format: 'json', temperature: 0.1 }));
  });

  it('raises temperature on retries so a bad response is not reproduced verbatim', async () => {
    const provider = new ScriptedProvider(['garbage']);
    const spy = vi.spyOn(provider, 'generate');
    PromptRunner.setProvider(provider);

    await PromptRunner.run({ ...baseOptions, taskClass: 'analytical' });

    const temperatures = spy.mock.calls.map((call) => call[1]?.temperature);
    expect(temperatures[0]).toBeLessThan(temperatures[1] as number);
  });
});

describe('PromptRunner.probe', () => {
  it('reports available when the provider answers', async () => {
    PromptRunner.setProvider(new ScriptedProvider(['ok']));
    await expect(PromptRunner.probe()).resolves.toEqual({ available: true });
  });

  it('reports unavailable with the error when the provider throws', async () => {
    // `OllamaProvider.isAvailable()` hardcodes true, so a real probe is the only
    // way a caller can choose the deterministic path before wasting a budget.
    PromptRunner.setProvider(new ScriptedProvider([new Error('connect ECONNREFUSED')]));
    await expect(PromptRunner.probe()).resolves.toEqual({
      available: false,
      error: 'connect ECONNREFUSED',
    });
  });

  it('reports unavailable for an empty completion', async () => {
    PromptRunner.setProvider(new ScriptedProvider(['']));
    await expect(PromptRunner.probe()).resolves.toEqual({ available: false });
  });
});
