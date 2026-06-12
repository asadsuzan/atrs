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

export const updateConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { server } = req.body;
    console.log("server", server);
    if (!server || !server.port || !server.mongodbUri) {
      return res.status(400).json({ message: 'Server configuration settings are incomplete' });
    }

    const configData = {
      server: {
        port: parseInt(server.port, 10),
        mongodbUri: server.mongodbUri
      }
    };

    // 1. Write to app.config.json
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');

    // 2. Write to .env
    const envContent = `PORT=${configData.server.port}
MONGODB_URI=${configData.server.mongodbUri}
`;
    fs.writeFileSync(envPath, envContent, 'utf8');

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
