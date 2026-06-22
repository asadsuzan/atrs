import { Request, Response, NextFunction } from 'express';

/**
 * Reverse proxy for the official WordPress.org readme validator.
 *
 * The validator at the URL below sends `X-Frame-Options: SAMEORIGIN`, so it
 * cannot be embedded in an <iframe> directly. This endpoint fetches it
 * server-side and re-serves it from our own origin without the framing/CSP
 * headers, so the client can embed it.
 *
 * The validator's form uses `action=""` (it posts to its own URL) and all of
 * its assets are absolute `https://` URLs, so no HTML rewriting is needed:
 * a same-origin <iframe src="/api/tools/readme-validator"> posts straight back
 * here, and we forward the submission upstream. There is no CSRF nonce or
 * session cookie involved.
 */
const VALIDATOR_URL = 'https://wordpress.org/plugins/developers/readme-validator/';

export const readmeValidatorProxy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const init: RequestInit = {
      method: req.method,
      headers: {
        'user-agent': req.get('user-agent') || 'ATRS-Readme-Tools',
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    };

    // Forward the form submission verbatim as application/x-www-form-urlencoded.
    if (req.method === 'POST') {
      const body = new URLSearchParams();
      for (const [key, value] of Object.entries(req.body || {})) {
        body.append(key, Array.isArray(value) ? value.join(',') : String(value ?? ''));
      }
      init.body = body.toString();
      (init.headers as Record<string, string>)['content-type'] = 'application/x-www-form-urlencoded';
    }

    const upstream = await fetch(VALIDATOR_URL, init);
    const html = await upstream.text();

    // Drop the headers (set globally by helmet) that would either block framing
    // or block the page's own absolute wordpress.org assets/scripts.
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Cross-Origin-Embedder-Policy');
    res.removeHeader('Cross-Origin-Opener-Policy');

    res.status(upstream.status);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    next(error);
  }
};
