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

export default router;
