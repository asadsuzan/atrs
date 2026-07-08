import fs from 'fs';
import path from 'path';
import { AppConfig } from '../models/AppConfig';

const configPath = path.resolve(__dirname, '../../../app.config.json');

/**
 * True when running on a platform with a read-only filesystem (Vercel).
 * There, runtime config lives in MongoDB instead of app.config.json.
 */
export function isServerless(): boolean {
  return !!process.env.VERCEL;
}

// --- Serverless config cache -------------------------------------------------
// readAppConfig() must stay synchronous (it's called deep inside request
// handlers), so on serverless we keep an in-memory copy loaded from MongoDB at
// bootstrap and refresh it in the background when it goes stale. Staleness only
// matters across warm instances after an admin saves settings; 30s is plenty.

const CACHE_TTL_MS = 30_000;
let cache: Record<string, any> | null = null;
let cacheLoadedAt = 0;
let refreshInFlight: Promise<void> | null = null;

function readConfigFile(): any {
  try {
    if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    /* fall through to default */
  }
  return {};
}

async function fetchConfigFromDb(): Promise<Record<string, any> | null> {
  const doc = await AppConfig.findOne({ singleton: 'app' }).lean();
  return (doc?.data as Record<string, any>) ?? null;
}

/**
 * Loads the serverless config cache from MongoDB (called from bootstrap once
 * the connection is up). First boot seeds the DB copy from the bundled
 * app.config.json so existing settings carry over. No-op locally.
 */
export async function loadAppConfigCache(): Promise<void> {
  if (!isServerless()) return;
  const fromDb = await fetchConfigFromDb();
  if (fromDb) {
    cache = fromDb;
  } else {
    const seed = readConfigFile();
    // A sealed R2 secret was encrypted with the *local* machine's key
    // (derived from its JWT_SECRET) and can't be decrypted on this platform.
    // Drop it so the R2_SECRET_ACCESS_KEY env var (or a re-entry in Settings)
    // takes over instead of shadowing it with an undecryptable value.
    if (seed?.storage?.r2?.secretAccessKey) {
      seed.storage.r2.secretAccessKey = '';
    }
    cache = seed;
    if (Object.keys(seed).length > 0) {
      await AppConfig.updateOne(
        { singleton: 'app' },
        { $setOnInsert: { data: seed } },
        { upsert: true }
      ).catch((err) => console.error('[config]: Failed to seed config into MongoDB:', err));
    }
  }
  cacheLoadedAt = Date.now();
}

/** Reads the app config, returning {} if it's missing or unreadable. */
export function readAppConfig(): any {
  if (!isServerless()) return readConfigFile();

  // Stale-while-revalidate: serve the cached copy, refresh in the background.
  if (cache && Date.now() - cacheLoadedAt > CACHE_TTL_MS && !refreshInFlight) {
    refreshInFlight = loadAppConfigCache()
      .catch(() => {})
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return cache ?? readConfigFile();
}

/**
 * Persists the app config: MongoDB on serverless, atomic file write locally.
 */
export async function saveAppConfig(config: Record<string, any>): Promise<void> {
  if (isServerless()) {
    await AppConfig.updateOne({ singleton: 'app' }, { $set: { data: config } }, { upsert: true });
    cache = config;
    cacheLoadedAt = Date.now();
    return;
  }
  const tmp = `${configPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), 'utf8');
  fs.renameSync(tmp, configPath);
}

export const DEFAULT_STALE_DAYS = 7;

/**
 * How many days without a changelog update before a product is flagged "stale"
 * on the dashboard. Admin-configurable; clamped to a sane 1..365 range.
 */
export function getStaleAlertDays(): number {
  const d = Number(readAppConfig()?.staleAlert?.days);
  if (!Number.isFinite(d) || d < 1) return DEFAULT_STALE_DAYS;
  return Math.min(Math.floor(d), 365);
}
