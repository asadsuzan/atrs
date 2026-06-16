import { Router, Request, Response } from 'express';
import { importSessionManager } from '../services/ImportSessionManager';

// Mounted behind requireAuth + requireActive in index.ts.
const router = Router();

/**
 * Generic cancellation endpoint for any in-flight streaming job (bulk delete,
 * media purge, user cascade, etc.). Flags the session so its loop stops at the
 * next item boundary. Deletes are not rolled back — cancel just halts further
 * processing.
 */
router.post('/cancel', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ message: 'sessionId is required' });
  }
  const found = importSessionManager.cancel(sessionId, req.user!.id);
  if (!found) {
    return res.status(404).json({ message: 'Job session not found' });
  }
  res.status(200).json({ message: 'Cancellation requested' });
});

export default router;
