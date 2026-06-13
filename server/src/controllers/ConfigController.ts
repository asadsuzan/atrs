import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

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
    const { server } = req.body;
    if (!server || !server.port || !server.mongodbUri) {
      return res.status(400).json({ message: 'Server configuration settings are incomplete' });
    }

    const port = parseInt(server.port, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      return res.status(400).json({ message: 'Port must be a number between 1 and 65535' });
    }
    if (!/^mongodb(\+srv)?:\/\//.test(String(server.mongodbUri))) {
      return res.status(400).json({ message: 'MongoDB URI must start with mongodb:// or mongodb+srv://' });
    }

    const configData = {
      server: { port, mongodbUri: server.mongodbUri }
    };

    // 1. Write to app.config.json (atomic via temp file + rename)
    const tmpConfig = `${configPath}.tmp`;
    fs.writeFileSync(tmpConfig, JSON.stringify(configData, null, 2), 'utf8');
    fs.renameSync(tmpConfig, configPath);

    // 2. Merge into .env, preserving all other keys (JWT_SECRET, ROOT_ADMIN_*, etc.)
    const env = readEnvFile();
    env.PORT = String(port);
    env.MONGODB_URI = server.mongodbUri;
    const envContent = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    const tmpEnv = `${envPath}.tmp`;
    fs.writeFileSync(tmpEnv, envContent, 'utf8');
    fs.renameSync(tmpEnv, envPath);

    res.status(200).json({
      message: 'Configuration updated successfully. Server is restarting to apply changes...',
      config: configData
    });

    // 3. Gracefully exit process in production to trigger restart by process manager
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        console.log('🔄 Restarting server in production...');
        process.exit(0);
      }, 1000);
    } else {
      console.log('📝 Configuration files updated. Nodemon should restart the server automatically.');
    }

  } catch (error) {
    next(error);
  }
};
