import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import chokidar, { FSWatcher } from 'chokidar';
import { Product } from '../models/Product';
import { Activity } from '../models/Activity';
import { notificationManager } from './NotificationManager';

const execFileP = promisify(execFile);

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const configPath = path.resolve(__dirname, '../../../app.config.json');

// Debounce window per file so a burst of saves yields a single entry.
const DEBOUNCE_MS = 1000;
// Cap the diff sent to the model so prompt processing stays fast.
const MAX_DIFF_CHARS = 3500;
// Keep the model resident in Ollama between edits (avoids slow cold reloads).
const KEEP_ALIVE = '30m';

const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.astro',
  '.py', '.php', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.cs',
  '.css', '.scss', '.sass', '.less', '.html', '.json', '.md', '.sql', '.sh', '.yml', '.yaml',
]);

// Directories we never want to watch / react to.
const IGNORED = /(^|[\\/])(node_modules|\.git|dist|build|out|coverage|\.next|\.turbo|\.cache|\.vite|vendor|__pycache__)([\\/]|$)/;

type ActivityType = 'feature' | 'improvement' | 'bug-fix';

interface WatchEntry {
  watcher: FSWatcher;
  repoPath: string;
  productName: string;
  ownerId: string;
}

class CodeTrackerService {
  private watchers = new Map<string, WatchEntry>(); // productId -> entry
  private timers = new Map<string, NodeJS.Timeout>(); // debounce key -> timer
  private contentCache = new Map<string, string>(); // absPath -> last content
  private enabled = false;
  private model = 'qwen2.5-coder';
  private lastError: string | null = null;
  private lastEventAt: Date | null = null;
  private lastActivityAt: Date | null = null;
  private lastWarmedModel: string | null = null;

  /** Reads the persisted codeTracker config (enabled + model). */
  private readConfig(): { enabled: boolean; model: string } {
    try {
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
          enabled: !!data?.codeTracker?.enabled,
          model: data?.codeTracker?.model || 'qwen2.5-coder',
        };
      }
    } catch { /* fall through to defaults */ }
    return { enabled: false, model: 'qwen2.5-coder' };
  }

  /** Public snapshot for the status endpoint. */
  status() {
    return {
      enabled: this.enabled,
      model: this.model,
      ollamaUrl: OLLAMA_URL,
      lastError: this.lastError,
      lastEventAt: this.lastEventAt,
      lastActivityAt: this.lastActivityAt,
      watching: Array.from(this.watchers.entries()).map(([productId, e]) => ({
        productId,
        productName: e.productName,
        repoPath: e.repoPath,
      })),
    };
  }

  private stopAll() {
    for (const { watcher } of this.watchers.values()) watcher.close().catch(() => {});
    this.watchers.clear();
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  /**
   * Reconciles watchers with the current config + products. Safe to call
   * repeatedly (on boot, on product changes, on config save).
   */
  async refresh(): Promise<void> {
    const cfg = this.readConfig();
    this.enabled = cfg.enabled;
    this.model = cfg.model;

    if (!this.enabled) {
      if (this.watchers.size) console.log('[CodeTracker] disabled — stopping watchers');
      this.stopAll();
      return;
    }

    let products: any[] = [];
    try {
      products = await Product.find({ repoPath: { $nin: ['', null] } })
        .select('name ownerId repoPath')
        .lean();
    } catch (err) {
      console.error('[CodeTracker] failed to load products:', err);
      return;
    }

    const wanted = new Map<string, any>();
    for (const p of products) {
      if (p.repoPath && fs.existsSync(p.repoPath)) wanted.set(p._id.toString(), p);
    }

    // Drop watchers that are gone or whose path changed.
    for (const [pid, entry] of this.watchers) {
      const p = wanted.get(pid);
      if (!p || p.repoPath !== entry.repoPath) {
        entry.watcher.close().catch(() => {});
        this.watchers.delete(pid);
      }
    }

    // Add watchers for newly-configured products.
    for (const [pid, p] of wanted) {
      if (this.watchers.has(pid)) continue;
      this.startWatcher(pid, p);
    }

    // Preload the model so the first edit doesn't pay the cold-load cost.
    if (this.watchers.size > 0 && this.lastWarmedModel !== this.model) {
      this.lastWarmedModel = this.model;
      void this.warmUp();
    }

    const withPath = products.filter((p) => p.repoPath).length;
    const missing = products.filter((p) => p.repoPath && !fs.existsSync(p.repoPath));
    console.log(`[CodeTracker] refresh: enabled=${this.enabled}, model=${this.model}, products with repoPath=${withPath}, watching=${this.watchers.size}`);
    if (missing.length) {
      const msg = `repoPath does not exist on disk: ${missing.map((m) => m.repoPath).join(', ')}`;
      this.lastError = msg;
      console.warn(`[CodeTracker] ${msg}`);
    } else if (this.watchers.size > 0) {
      this.lastError = null;
    }
  }

  private startWatcher(productId: string, product: any) {
    const repoPath: string = product.repoPath;
    try {
      const watcher = chokidar.watch(repoPath, {
        ignored: IGNORED,
        ignoreInitial: true,
        persistent: true,
        // Some editors (atomic saves) / filesystems (network drives, some Windows
        // setups) don't emit native fs events reliably — set CODE_TRACKER_POLLING=true.
        usePolling: process.env.CODE_TRACKER_POLLING === 'true',
        interval: 500,
        awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
      });
      watcher.on('change', (file) => this.onFileEvent(productId, file));
      watcher.on('add', (file) => this.onFileEvent(productId, file));
      watcher.on('ready', () => console.log(`[CodeTracker] watcher ready for "${product.name}" (${repoPath})`));
      watcher.on('error', (err) => console.error(`[CodeTracker] watcher error (${product.name}):`, err));

      this.watchers.set(productId, {
        watcher,
        repoPath,
        productName: product.name,
        ownerId: product.ownerId.toString(),
      });
      console.log(`[CodeTracker] watching "${product.name}" at ${repoPath} (model: ${this.model})`);
    } catch (err) {
      console.error(`[CodeTracker] failed to watch ${repoPath}:`, err);
    }
  }

  private onFileEvent(productId: string, absPath: string) {
    if (IGNORED.test(absPath)) return;
    if (!CODE_EXTENSIONS.has(path.extname(absPath).toLowerCase())) return;

    this.lastEventAt = new Date();
    console.log(`[CodeTracker] change detected: ${absPath}`);

    const key = `${productId}::${absPath}`;
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);
    this.timers.set(key, setTimeout(() => {
      this.timers.delete(key);
      this.process(productId, absPath).catch((err) =>
        console.error('[CodeTracker] processing failed:', err)
      );
    }, DEBOUNCE_MS));
  }

  /** Computes a diff for the file (git first, then an in-memory content delta). */
  private async computeDiff(repoPath: string, absPath: string): Promise<string> {
    const relPath = path.relative(repoPath, absPath);

    // Prefer a real git diff vs the last commit when the repo is under git.
    try {
      const { stdout } = await execFileP('git', ['-C', repoPath, 'diff', '--no-color', 'HEAD', '--', relPath], {
        timeout: 5000,
        maxBuffer: 4 * 1024 * 1024,
      });
      if (stdout.trim()) return stdout.trim().slice(0, MAX_DIFF_CHARS);
    } catch { /* not a git repo / no git — fall back below */ }

    // Fallback: diff against the last content we saw for this file.
    let content = '';
    try { content = fs.readFileSync(absPath, 'utf8'); } catch { return ''; }
    const prev = this.contentCache.get(absPath);
    this.contentCache.set(absPath, content);

    if (prev === undefined) {
      return `New/whole file snapshot:\n${content}`.slice(0, MAX_DIFF_CHARS);
    }
    const oldLines = prev.split('\n');
    const newLines = content.split('\n');
    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);
    const added = newLines.filter((l) => l.trim() && !oldSet.has(l)).slice(0, 80);
    const removed = oldLines.filter((l) => l.trim() && !newSet.has(l)).slice(0, 80);
    if (!added.length && !removed.length) return '';
    return [
      '--- added ---',
      added.map((l) => `+ ${l}`).join('\n'),
      '--- removed ---',
      removed.map((l) => `- ${l}`).join('\n'),
    ].join('\n').slice(0, MAX_DIFF_CHARS);
  }

  /** Loads the model into Ollama memory (kept alive) so later calls are fast. */
  private async warmUp() {
    try {
      await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: 'ready', stream: false, keep_alive: KEEP_ALIVE, options: { num_predict: 1 } }),
      });
      console.log(`[CodeTracker] warmed up model "${this.model}"`);
    } catch {
      /* best-effort; the real call will report any error */
    }
  }

  /** Asks Ollama for a concise title + type + summary for the diff. */
  private async generate(relPath: string, diff: string): Promise<{ title: string; type: ActivityType; summary: string } | null> {
    const prompt = [
      'You are a senior developer writing changelog entries.',
      'A source file was just edited. From the diff, produce a concise changelog-style title, a one-sentence summary, and a classification.',
      'Rules:',
      '- "title": imperative, max 8 words, no trailing period (e.g. "Revamp user login layout").',
      '- "type": one of "feature" (new capability), "improvement" (enhancement/refactor/update), "bug-fix" (fixes a bug).',
      '- "summary": one short sentence describing the change.',
      'Respond with JSON only: {"title": string, "type": "feature"|"improvement"|"bug-fix", "summary": string}',
      '',
      `File: ${relPath}`,
      'Diff:',
      diff,
    ].join('\n');

    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          format: 'json',
          keep_alive: KEEP_ALIVE,
          options: { temperature: 0.2, num_predict: 160 },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const reason = /not found/i.test(body)
          ? `Model "${this.model}" not found — run: ollama pull ${this.model}`
          : `Ollama responded ${res.status}`;
        this.lastError = reason;
        console.warn(`[CodeTracker] ${reason}`);
        return null;
      }
      const data: any = await res.json();
      const parsed = JSON.parse(data.response);
      const title = String(parsed.title || '').trim().replace(/\.$/, '').slice(0, 120);
      if (!title) { this.lastError = 'Ollama returned an empty title'; return null; }
      const type: ActivityType = ['feature', 'improvement', 'bug-fix'].includes(parsed.type) ? parsed.type : 'improvement';
      const summary = String(parsed.summary || '').trim().slice(0, 400);
      this.lastError = null;
      return { title, type, summary };
    } catch (err: any) {
      const refused = /ECONNREFUSED|fetch failed/i.test(err?.message || '');
      this.lastError = refused
        ? `Cannot reach Ollama at ${OLLAMA_URL} — is it running?`
        : `Ollama call failed: ${err?.message || err}`;
      console.warn(`[CodeTracker] ${this.lastError}`);
      return null;
    }
  }

  private async process(productId: string, absPath: string) {
    if (!this.enabled) return;
    const entry = this.watchers.get(productId);
    if (!entry) return;

    const relPath = path.relative(entry.repoPath, absPath);
    const diff = await this.computeDiff(entry.repoPath, absPath);
    if (!diff) {
      console.log(`[CodeTracker] no diff for ${relPath} — skipping`);
      return; // nothing meaningful changed
    }

    const result = await this.generate(relPath, diff);
    if (!result) {
      // Tell the owner/admins why nothing was created (e.g. model not pulled).
      const errPayload = { productId, productName: entry.productName, filePath: relPath, error: this.lastError || 'AI generation failed' };
      notificationManager.sendToUser(entry.ownerId, 'code-activity-error', errPayload);
      notificationManager.sendToAdmins('code-activity-error', errPayload);
      return;
    }
    this.lastActivityAt = new Date();

    // Create a draft (unreleased) changelog entry, flagged as auto-tracked.
    let activity: any;
    try {
      activity = await Activity.create({
        productId,
        ownerId: entry.ownerId,
        type: result.type,
        title: result.title,
        shortDescription: result.summary || `Auto-detected change in ${relPath}`,
        tags: ['unreleased', 'auto-tracked'],
        autoTracked: true,
        filePath: relPath,
        activityDate: new Date(),
      });
    } catch (err) {
      console.error('[CodeTracker] failed to create activity:', err);
      return;
    }

    console.log(`[CodeTracker] ${entry.productName}: "${result.title}" (${result.type}) from ${relPath}`);

    // Push the live update to the owner and any connected admins.
    const payload = {
      id: activity._id.toString(),
      productId,
      productName: entry.productName,
      filePath: relPath,
      title: result.title,
      type: result.type,
      summary: result.summary,
      createdAt: activity.createdAt,
    };
    notificationManager.sendToUser(entry.ownerId, 'code-activity', payload);
    notificationManager.sendToAdmins('code-activity', payload);
  }
}

export const codeTrackerService = new CodeTrackerService();
