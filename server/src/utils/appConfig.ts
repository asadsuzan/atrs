import fs from 'fs';
import path from 'path';

const configPath = path.resolve(__dirname, '../../../app.config.json');

/** Reads app.config.json, returning {} if it's missing or unreadable. */
export function readAppConfig(): any {
  try {
    if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    /* fall through to default */
  }
  return {};
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
