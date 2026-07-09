import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { hasControlChars } from '../utils/sanitize';
import { readAppConfig, saveAppConfig, isServerless, DEFAULT_APP_CONFIG } from '../utils/appConfig';
import { sealSecret, isSealedSecret } from '../utils/crypto';
import { sealR2Secret, isSealedR2Secret, getStorageConfig, testR2Connection } from '../utils/r2Storage';

const envPath = path.resolve(__dirname, '../../../.env');

export const getConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fall back to defaults instead of 404 so a fresh deploy (empty store)
    // still renders the Settings page.
    const stored = readAppConfig();
    const data = stored && Object.keys(stored).length > 0 ? stored : { ...DEFAULT_APP_CONFIG };
    // Storage settings: return the *effective* non-secret values (stored
    // config with R2_* env-var fallbacks) so the Settings form reflects what
    // the server actually uses. The secret access key is write-only: never
    // send it (or its encrypted form) to the browser — only whether one is
    // stored (in config or via env).
    if (data.storage) {
      const effective = getStorageConfig();
      data.storage = {
        provider: data.storage.provider === 'r2' ? 'r2' : 'local',
        r2: {
          accountId: effective.r2.accountId,
          bucket: effective.r2.bucket,
          publicBaseUrl: effective.r2.publicBaseUrl,
          accessKeyId: effective.r2.accessKeyId,
          secretAccessKey: '',
          secretAccessKeySet: !!(effective.r2.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY),
        },
      };
    }
    // Same for the Ollama Cloud settings (key is write-only).
    if (data.changelogGen) {
      const hasKey = !!(data.changelogGen.ollamaCloudKey || process.env.OLLAMA_CLOUD_KEY);
      data.changelogGen = {
        ...data.changelogGen,
        ollamaCloudUrl: data.changelogGen.ollamaCloudUrl || process.env.OLLAMA_CLOUD_URL || '',
        ollamaCloudKey: '',
        ollamaCloudKeySet: hasKey,
      };
    }
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Tests Cloudflare R2 credentials with a write/read/delete round-trip, so the
 * admin can verify settings before saving. Blank fields (notably the write-only
 * secret) fall back to what's already stored / provided via R2_* env vars.
 */
export const testStorageConnection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body || {};
    const current = getStorageConfig().r2;
    const clean = (v: unknown) =>
      typeof v === 'string' && !hasControlChars(v) ? v.trim() : '';
    const candidate = {
      accountId: clean(body.accountId) || current.accountId,
      bucket: clean(body.bucket) || current.bucket,
      publicBaseUrl: (clean(body.publicBaseUrl) || current.publicBaseUrl).replace(/\/+$/, ''),
      accessKeyId: clean(body.accessKeyId) || current.accessKeyId,
      secretAccessKey: clean(body.secretAccessKey) || current.secretAccessKey,
    };
    const result = await testR2Connection(candidate);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** Reads .env into a key=>value map, preserving keys we don't manage. */
const readEnvFile = (): Record<string, string> => {
  const map: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return map;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1);
  }
  return map;
};

export const updateConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { server, sounds, navigation, changelogGen, staleAlert, branding, storage } = req.body;

    // Load existing config to merge
    let currentConfig: any = {
      server: { port: 5000, mongodbUri: 'mongodb://localhost:27017/atrs' },
      sounds: {
        enabled: true,
        successSound: 'synth-success',
        deleteSound: 'synth-delete',
        errorSound: 'synth-error',
        notificationSound: 'synth-notification',
        clickSound: 'synth-click',
        volume: 0.5
      },
      navigation: { mode: 'expanded' },
      changelogGen: { model: 'qwen2.5-coder', ollamaMode: 'local', ollamaCloudUrl: '', ollamaCloudKey: '' },
      staleAlert: { days: 7 },
      branding: { companyName: '', logoUrl: '', accentColor: '', thankYouEnabled: true, thankYouTitle: '', thankYouMessage: '' },
      storage: { provider: 'local', r2: { accountId: '', bucket: '', publicBaseUrl: '', accessKeyId: '', secretAccessKey: '' } }
    };

    const existing = readAppConfig();
    if (existing && Object.keys(existing).length > 0) {
      currentConfig = existing;
    }

    // Migrate the legacy `codeTracker` block (used before the code-activity
    // tracker was removed) to `changelogGen`, preserving the Ollama settings.
    if (!currentConfig.changelogGen && currentConfig.codeTracker) {
      const legacy = currentConfig.codeTracker;
      currentConfig.changelogGen = {
        model: legacy.model || 'qwen2.5-coder',
        ollamaMode: legacy.ollamaMode || 'local',
        ollamaCloudUrl: legacy.ollamaCloudUrl || '',
        ollamaCloudKey: legacy.ollamaCloudKey || '',
      };
    }
    delete currentConfig.codeTracker;

    let isServerChanged = false;
    let targetPort = currentConfig.server?.port || 5000;
    let targetUri = currentConfig.server?.mongodbUri || '';

    if (server) {
      if (!server.port || !server.mongodbUri) {
        return res.status(400).json({ message: 'Server configuration settings are incomplete' });
      }

      const port = parseInt(server.port, 10);
      if (Number.isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({ message: 'Port must be a number between 1 and 65535' });
      }

      const mongodbUri = String(server.mongodbUri);
      if (hasControlChars(mongodbUri)) {
        return res.status(400).json({ message: 'MongoDB URI contains invalid control characters' });
      }
      if (!/^mongodb(\+srv)?:\/\//.test(mongodbUri)) {
        return res.status(400).json({ message: 'MongoDB URI must start with mongodb:// or mongodb+srv://' });
      }

      targetPort = port;
      targetUri = mongodbUri;
      isServerChanged =
        !currentConfig.server ||
        currentConfig.server.port !== port ||
        currentConfig.server.mongodbUri !== mongodbUri;
    }

    // Media storage backend (local uploads dir vs Cloudflare R2).
    const cleanStr = (v: unknown, max: number) =>
      typeof v === 'string' && !hasControlChars(v) ? v.trim().slice(0, max) : undefined;
    const curStorage = currentConfig.storage || {};
    const curR2 = curStorage.r2 || {};
    const storageIn = storage?.r2 || {};
    const mergedStorage = {
      provider: ['local', 'r2'].includes(storage?.provider)
        ? storage.provider
        : (curStorage.provider === 'r2' ? 'r2' : 'local'),
      r2: {
        accountId: cleanStr(storageIn.accountId, 64) ?? curR2.accountId ?? '',
        bucket: cleanStr(storageIn.bucket, 128) ?? curR2.bucket ?? '',
        publicBaseUrl: (cleanStr(storageIn.publicBaseUrl, 500) ?? curR2.publicBaseUrl ?? '').replace(/\/+$/, ''),
        accessKeyId: cleanStr(storageIn.accessKeyId, 128) ?? curR2.accessKeyId ?? '',
        // Write-only secret: a non-empty value replaces (encrypted at rest);
        // blank keeps whatever is already stored. Legacy plaintext values are
        // sealed on the next save.
        secretAccessKey: (() => {
          const provided = cleanStr(storageIn.secretAccessKey, 256);
          if (provided) return sealR2Secret(provided);
          const kept = curR2.secretAccessKey ?? '';
          return kept && !isSealedR2Secret(kept) ? sealR2Secret(kept) : kept;
        })(),
      },
    };
    if (storage) {
      if (mergedStorage.r2.publicBaseUrl && !/^https?:\/\//i.test(mergedStorage.r2.publicBaseUrl)) {
        return res.status(400).json({ message: 'R2 public base URL must start with http:// or https://' });
      }
      if (mergedStorage.provider === 'r2') {
        const r2 = mergedStorage.r2;
        // Credentials may also come from R2_* env vars, so only require what
        // neither the config nor the environment provides.
        const missing = [
          !(r2.accountId || process.env.R2_ACCOUNT_ID) && 'Account ID',
          !(r2.bucket || process.env.R2_BUCKET) && 'Bucket',
          !(r2.publicBaseUrl || process.env.R2_PUBLIC_BASE_URL) && 'Public base URL',
          !(r2.accessKeyId || process.env.R2_ACCESS_KEY_ID) && 'Access Key ID',
          !(r2.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY) && 'Secret Access Key',
        ].filter(Boolean);
        if (missing.length) {
          return res.status(400).json({ message: `Cloudflare R2 settings incomplete: ${missing.join(', ')} required.` });
        }
      }
    }

    const mergedConfig = {
      server: {
        port: targetPort,
        mongodbUri: targetUri
      },
      sounds: sounds ? {
        enabled: typeof sounds.enabled === 'boolean' ? sounds.enabled : currentConfig.sounds?.enabled ?? true,
        successSound: sounds.successSound || currentConfig.sounds?.successSound || 'synth-success',
        deleteSound: sounds.deleteSound || currentConfig.sounds?.deleteSound || 'synth-delete',
        errorSound: sounds.errorSound || currentConfig.sounds?.errorSound || 'synth-error',
        notificationSound: sounds.notificationSound || currentConfig.sounds?.notificationSound || 'synth-notification',
        clickSound: sounds.clickSound || currentConfig.sounds?.clickSound || 'synth-click',
        volume: typeof sounds.volume === 'number' ? sounds.volume : currentConfig.sounds?.volume ?? 0.5
      } : (currentConfig.sounds || {
        enabled: true,
        successSound: 'synth-success',
        deleteSound: 'synth-delete',
        errorSound: 'synth-error',
        notificationSound: 'synth-notification',
        clickSound: 'synth-click',
        volume: 0.5
      }),
      navigation: {
        mode: ['expanded', 'collapsed', 'disabled'].includes(navigation?.mode)
          ? navigation.mode
          : (currentConfig.navigation?.mode || 'expanded'),
      },
      changelogGen: {
        model: (typeof changelogGen?.model === 'string' && changelogGen.model.trim())
          ? changelogGen.model.trim()
          : (currentConfig.changelogGen?.model || 'qwen2.5-coder'),
        ollamaMode: ['local', 'cloud'].includes(changelogGen?.ollamaMode)
          ? changelogGen.ollamaMode
          : (currentConfig.changelogGen?.ollamaMode || 'local'),
        ollamaCloudUrl: typeof changelogGen?.ollamaCloudUrl === 'string'
          ? changelogGen.ollamaCloudUrl.trim()
          : (currentConfig.changelogGen?.ollamaCloudUrl || ''),
        // Write-only secret: a non-empty value replaces (sealed at rest);
        // blank keeps whatever is already stored. Legacy plaintext values
        // are sealed on the next save.
        ollamaCloudKey: (() => {
          const provided = typeof changelogGen?.ollamaCloudKey === 'string'
            ? changelogGen.ollamaCloudKey.trim()
            : '';
          if (provided) return sealSecret(provided);
          const kept = currentConfig.changelogGen?.ollamaCloudKey || '';
          return kept && !isSealedSecret(kept) ? sealSecret(kept) : kept;
        })(),
      },
      staleAlert: {
        days: (typeof staleAlert?.days === 'number' && staleAlert.days >= 1)
          ? Math.min(Math.floor(staleAlert.days), 365)
          : (currentConfig.staleAlert?.days ?? 7),
      },
      branding: (() => {
        const cur = currentConfig.branding || {};
        if (!branding) return cur;
        const clean = (v: unknown, max: number) =>
          typeof v === 'string' ? v.replace(/[ -]/g, '').trim().slice(0, max) : undefined;
        const name = clean(branding.companyName, 80);
        const logo = clean(branding.logoUrl, 500);
        // Only accept safe logo URLs (https/http, root-relative, or inline data image).
        const logoOk = logo === '' || (logo && /^(https?:\/\/|\/|data:image\/)/i.test(logo));
        const accentRaw = clean(branding.accentColor, 7);
        const accentOk = accentRaw === '' || (accentRaw && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accentRaw));
        const tyTitle = clean(branding.thankYouTitle, 80);
        const tyMsg = clean(branding.thankYouMessage, 300);
        return {
          companyName: name !== undefined ? name : cur.companyName || '',
          logoUrl: logo !== undefined && logoOk ? logo : cur.logoUrl || '',
          accentColor: accentRaw !== undefined && accentOk ? accentRaw : cur.accentColor || '',
          // When true, the presentation deck derives the accent from each
          // product's logo/banner instead of using the fixed accentColor.
          accentDynamic: typeof branding.accentDynamic === 'boolean' ? branding.accentDynamic : (cur.accentDynamic ?? false),
          thankYouEnabled: typeof branding.thankYouEnabled === 'boolean' ? branding.thankYouEnabled : (cur.thankYouEnabled ?? true),
          thankYouTitle: tyTitle !== undefined ? tyTitle : cur.thankYouTitle || '',
          thankYouMessage: tyMsg !== undefined ? tyMsg : cur.thankYouMessage || '',
        };
      })(),
      storage: mergedStorage,
    };

    // 1. Persist the config (MongoDB on serverless, app.config.json locally)
    await saveAppConfig(mergedConfig);

    // 2. Only update .env if server settings changed. On serverless there is
    //    no writable .env and no process to restart — PORT/MONGODB_URI come
    //    from the platform's environment variables instead.
    if (isServerChanged && !isServerless()) {
      const env = readEnvFile();
      env.PORT = String(targetPort);
      env.MONGODB_URI = targetUri;
      const envContent = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
      const tmpEnv = `${envPath}.tmp`;
      fs.writeFileSync(tmpEnv, envContent, 'utf8');
      fs.renameSync(tmpEnv, envPath);
    }

    res.status(200).json({
      message: isServerChanged && !isServerless()
        ? 'Configuration updated successfully. Server is restarting to apply changes...'
        : 'Configuration saved successfully.',
      config: mergedConfig
    });

    // 3. Gracefully exit process in production if server connection settings changed
    if (isServerChanged && !isServerless()) {
      if (process.env.NODE_ENV === 'production') {
        setTimeout(() => {
          console.log('🔄 Restarting server in production...');
          process.exit(0);
        }, 1000);
      } else {
        console.log('📝 Configuration files updated. Nodemon should restart the server automatically.');
      }
    }
  } catch (error) {
    next(error);
  }
};
