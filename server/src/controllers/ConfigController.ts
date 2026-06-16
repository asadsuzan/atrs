import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { hasControlChars } from '../utils/sanitize';

const configPath = path.resolve(__dirname, '../../../app.config.json');
const envPath = path.resolve(__dirname, '../../../.env');

export const getConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ message: 'Configuration file not found' });
    }
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    res.status(200).json(data);
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
    const { server, sounds, navigation } = req.body;

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
      navigation: { mode: 'expanded' }
    };

    if (fs.existsSync(configPath)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch {}
    }

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
      }
    };

    // 1. Write to app.config.json (atomic via temp file + rename)
    const tmpConfig = `${configPath}.tmp`;
    fs.writeFileSync(tmpConfig, JSON.stringify(mergedConfig, null, 2), 'utf8');
    fs.renameSync(tmpConfig, configPath);

    // 2. Only update .env if server settings changed
    if (isServerChanged) {
      const env = readEnvFile();
      env.PORT = String(targetPort);
      env.MONGODB_URI = targetUri;
      const envContent = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
      const tmpEnv = `${envPath}.tmp`;
      fs.writeFileSync(tmpEnv, envContent, 'utf8');
      fs.renameSync(tmpEnv, envPath);
    }

    res.status(200).json({
      message: isServerChanged
        ? 'Configuration updated successfully. Server is restarting to apply changes...'
        : 'Configuration saved successfully.',
      config: mergedConfig
    });

    // 3. Gracefully exit process in production if server connection settings changed
    if (isServerChanged) {
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
