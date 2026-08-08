/**
 * Sends a Telegram notification whenever a visitor loads the site — signed
 * in or not. Configured via TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID; if either
 * is unset the service silently no-ops so local/dev environments without a
 * bot configured don't error out.
 */

export interface VisitInfo {
  path?: string;
  referrer?: string;
  ip?: string;
  userAgent?: string;
  loggedIn?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMessage(info: VisitInfo): string {
  const lines = [
    '🔔 <b>New visitor on ATRS</b>',
    `🌐 Page: <code>${escapeHtml(info.path || '/')}</code>`,
    `👤 Status: ${info.loggedIn ? 'Logged in' : 'Not logged in'}`,
    `📍 IP: <code>${escapeHtml(info.ip || 'unknown')}</code>`,
  ];
  if (info.referrer) {
    lines.push(`🔗 Referrer: <code>${escapeHtml(info.referrer)}</code>`);
  }
  if (info.userAgent) {
    lines.push(`🖥️ User agent: <code>${escapeHtml(info.userAgent)}</code>`);
  }
  lines.push(`🕒 Time: ${new Date().toISOString()}`);
  return lines.join('\n');
}

/**
 * Fires a Telegram message for a visit. Never throws — a delivery failure
 * (missing config, Telegram API error, network issue) is logged and
 * swallowed so it can never break the page load it's reporting on.
 */
export async function sendVisitAlert(info: VisitInfo): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[VisitAlertService]: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping visit alert');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatMessage(info),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[VisitAlertService]: Telegram API responded ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error('[VisitAlertService]: Failed to send Telegram visit alert:', err);
  }
}
