import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { readAppConfig } from './appConfig';
import { sealSecret, isSealedSecret, unsealSecret } from './crypto';

/**
 * The R2 secret access key is stored encrypted (AES-256-GCM, same secret box
 * as GitHub tokens) inside the app config. Thin aliases over the generic
 * seal/unseal helpers in crypto.ts.
 */
export const sealR2Secret = sealSecret;
export const isSealedR2Secret = isSealedSecret;
const unsealR2Secret = unsealSecret;

export interface R2Settings {
  accountId: string;
  bucket: string;
  /** Public base URL the bucket is served from (r2.dev or a custom domain), no trailing slash. */
  publicBaseUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface StorageConfig {
  provider: 'local' | 'r2';
  r2: R2Settings;
}

/**
 * Resolves the storage settings from app.config.json, falling back to
 * R2_* environment variables for anything left blank (mirrors how the
 * changelog generator resolves its Ollama settings).
 */
export function getStorageConfig(): StorageConfig {
  const cfg = readAppConfig()?.storage || {};
  const r2 = cfg.r2 || {};
  // No explicit provider yet (e.g. fresh serverless deploy with an empty
  // config in MongoDB): default to R2 when the R2_* env vars fully
  // configure it, since local disk isn't an option there anyway.
  const envR2Complete = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_BUCKET &&
    process.env.R2_PUBLIC_BASE_URL &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
  const provider =
    cfg.provider === 'r2' ? 'r2'
    : cfg.provider === 'local' ? 'local'
    : envR2Complete ? 'r2'
    : 'local';
  return {
    provider,
    r2: {
      accountId: String(r2.accountId || process.env.R2_ACCOUNT_ID || '').trim(),
      bucket: String(r2.bucket || process.env.R2_BUCKET || '').trim(),
      publicBaseUrl: String(r2.publicBaseUrl || process.env.R2_PUBLIC_BASE_URL || '')
        .trim()
        .replace(/\/+$/, ''),
      accessKeyId: String(r2.accessKeyId || process.env.R2_ACCESS_KEY_ID || '').trim(),
      secretAccessKey: unsealR2Secret(
        String(r2.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '').trim()
      ),
    },
  };
}

export function isR2Configured(r2: R2Settings): boolean {
  return !!(r2.accountId && r2.bucket && r2.publicBaseUrl && r2.accessKeyId && r2.secretAccessKey);
}

/** True when the admin selected R2 AND all required settings are present. */
export function isR2Active(): boolean {
  const cfg = getStorageConfig();
  return cfg.provider === 'r2' && isR2Configured(cfg.r2);
}

// The client is cheap to build but settings can change at runtime (admin
// settings page), so cache it keyed on the credentials that shape it.
let cachedClient: S3Client | null = null;
let cachedClientKey = '';

function getClient(r2: R2Settings): S3Client {
  const key = `${r2.accountId}|${r2.accessKeyId}|${r2.secretAccessKey}`;
  if (!cachedClient || cachedClientKey !== key) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
    });
    cachedClientKey = key;
  }
  return cachedClient;
}

/** Absolute public URL for an object key, e.g. https://media.example.com/123-456.png */
export function r2PublicUrl(key: string, r2?: R2Settings): string {
  const settings = r2 || getStorageConfig().r2;
  return `${settings.publicBaseUrl}/${key}`;
}

/**
 * Extracts the object key from a stored media URL if it points at the
 * configured R2 bucket; returns null for local (`/uploads/...`) or foreign URLs.
 */
export function r2KeyFromUrl(url?: string | null, r2?: R2Settings): string | null {
  if (!url) return null;
  const settings = r2 || getStorageConfig().r2;
  if (!settings.publicBaseUrl) return null;
  const prefix = `${settings.publicBaseUrl}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  // Keys we generate are flat filenames — reject anything path-like.
  if (!key || key.includes('/') || key.includes('..')) return null;
  return key;
}

export async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const cfg = getStorageConfig();
  const client = getClient(cfg.r2);
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return r2PublicUrl(key, cfg.r2);
}

export async function deleteFromR2(key: string): Promise<void> {
  const cfg = getStorageConfig();
  const client = getClient(cfg.r2);
  await client.send(new DeleteObjectCommand({ Bucket: cfg.r2.bucket, Key: key }));
}

export async function r2ObjectExists(key: string): Promise<boolean> {
  const cfg = getStorageConfig();
  const client = getClient(cfg.r2);
  try {
    await client.send(new HeadObjectCommand({ Bucket: cfg.r2.bucket, Key: key }));
    return true;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return false;
    throw err;
  }
}

export interface R2Object {
  key: string;
  size: number;
  lastModified: Date;
}

export interface R2TestResult {
  ok: boolean;
  message: string;
}

/**
 * Verifies candidate R2 settings end-to-end with a tiny write/read/delete
 * round-trip, so an admin knows the credentials work BEFORE saving them.
 * Uses a fresh client (never the cache) since the settings are unsaved.
 */
export async function testR2Connection(r2: R2Settings): Promise<R2TestResult> {
  if (!isR2Configured(r2)) {
    return { ok: false, message: 'All R2 fields are required to test the connection.' };
  }
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
  });
  const probeKey = `.atrs-connection-probe-${Date.now()}`;
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: probeKey,
        Body: Buffer.from('atrs connection probe'),
        ContentType: 'text/plain',
      })
    );
    await client.send(new HeadObjectCommand({ Bucket: r2.bucket, Key: probeKey }));
    await client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: probeKey }));
    return { ok: true, message: `Connected — bucket "${r2.bucket}" is writable.` };
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode;
    const code = err?.name || err?.Code || '';
    if (code === 'NoSuchBucket' || status === 404) {
      return { ok: false, message: `Bucket "${r2.bucket}" was not found on this account.` };
    }
    if (status === 401 || status === 403 || code === 'InvalidAccessKeyId' || code === 'SignatureDoesNotMatch') {
      return { ok: false, message: 'Authentication failed — check the Access Key ID and Secret Access Key.' };
    }
    if (err?.code === 'ENOTFOUND' || err?.cause?.code === 'ENOTFOUND') {
      return { ok: false, message: 'Could not reach Cloudflare R2 — check the Account ID.' };
    }
    return { ok: false, message: `Connection failed: ${err?.message || 'unknown error'}` };
  } finally {
    client.destroy();
  }
}

/** Lists every object in the bucket (paginated under the hood). */
export async function listR2Objects(): Promise<R2Object[]> {
  const cfg = getStorageConfig();
  const client = getClient(cfg.r2);
  const objects: R2Object[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: cfg.r2.bucket, ContinuationToken: continuationToken })
    );
    for (const obj of page.Contents || []) {
      if (!obj.Key) continue;
      objects.push({
        key: obj.Key,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(0),
      });
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}
