import type { IncomingMessage, ServerResponse } from 'http';
import app, { bootstrap } from '../server/src/app';

/**
 * Vercel serverless entry: every /api/* request is rewritten here (see
 * vercel.json) and handled by the same Express app the local server runs.
 * bootstrap() is memoized — cold starts connect to MongoDB and load the
 * config cache once; warm invocations pass straight through.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await bootstrap();
  return app(req, res);
}
