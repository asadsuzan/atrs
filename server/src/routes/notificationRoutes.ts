import { Router, Request, Response } from 'express';
import { requireAuth, requireActive } from '../middlewares/auth';
import { notificationManager } from '../services/NotificationManager';

const router = Router();

/**
 * SSE Endpoint for clients to subscribe to real-time notification streams.
 * Expects JWT token either via Authorization header or "?token=<jwt>" query parameter.
 */
router.get('/subscribe', requireAuth, requireActive, (req: Request, res: Response) => {
  const user = req.user!;

  // Configure response headers for Server-Sent Events (SSE)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable output buffering in Nginx / proxy layers
  });

  // Send comment data immediately to flush headers
  res.write(': ok\n\n');

  // Keep connection socket alive and remove default client timeout limits
  req.socket.setKeepAlive(true);
  req.socket.setTimeout(0);

  // Add client handle to notification dispatcher
  const unsubscribe = notificationManager.addClient(user.id, user.isRoot, res);

  // Unregister user when client closes the socket connection
  req.on('close', () => {
    unsubscribe();
  });
});

/**
 * Public-authenticated endpoint for retrieving current sound settings.
 */
router.get('/sounds', requireAuth, requireActive, (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.resolve(__dirname, '../../../app.config.json');

    let soundsConfig = {
      enabled: true,
      successSound: 'synth-success',
      deleteSound: 'synth-delete',
      errorSound: 'synth-error',
      notificationSound: 'synth-notification',
      clickSound: 'synth-click',
      volume: 0.5
    };

    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.sounds) {
        soundsConfig = { ...soundsConfig, ...data.sounds };
      }
    }

    res.status(200).json(soundsConfig);
  } catch (error) {
    res.status(200).json({
      enabled: true,
      successSound: 'synth-success',
      deleteSound: 'synth-delete',
      errorSound: 'synth-error',
      notificationSound: 'synth-notification',
      clickSound: 'synth-click',
      volume: 0.5
    });
  }
});

export default router;
