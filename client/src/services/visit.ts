// Fires once per browser tab session to let the backend send a Telegram
// alert for the visit. Works for signed-out visitors too, so it uses plain
// fetch (no auth token required) against the public route.

const SESSION_FLAG = 'atrs_visit_reported';
const TOKEN_KEY = 'atrs_token';

/**
 * Reports the current page load as a "visit" exactly once per browser
 * session (tab), regardless of whether the visitor is signed in. Safe to
 * call on every app mount — it's a no-op after the first successful call
 * within a session, and never throws (a failed beacon must never affect the
 * page).
 */
export function reportVisitOnce(): void {
  if (typeof window === 'undefined') return;

  try {
    if (window.sessionStorage.getItem(SESSION_FLAG)) return;
    window.sessionStorage.setItem(SESSION_FLAG, '1');
  } catch {
    // sessionStorage unavailable (e.g. privacy mode) — fall through and
    // still attempt the beacon; worst case it fires more than once.
  }

  const payload = JSON.stringify({
    path: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
    loggedIn: Boolean(window.localStorage?.getItem(TOKEN_KEY)),
  });

  fetch('/api/public/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Best-effort only — visitor tracking must never surface an error.
  });
}
