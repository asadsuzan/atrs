import { Request, Response, NextFunction } from 'express';
import { execSync } from 'child_process';
import os from 'os';

// ANSI Truecolor Escape Codes for "Eye Peach" / pastel palette
const COLOR = {
  PEACH: '\x1b[38;2;255;180;150m',       // #FFB496 - Peach
  MINT: '\x1b[38;2;170;235;195m',        // #AAECB9 - Mint green
  SKY: '\x1b[38;2;170;210;240m',         // #AAD2F0 - Sky blue
  CREAM: '\x1b[38;2;255;240;210m',       // #FFF0D2 - Light cream
  ROSE: '\x1b[38;2;255;155;170m',        // #FF9BAA - Rose red
  MUTED: '\x1b[38;2;150;150;155m',       // #96969B - Muted gray
  RESET: '\x1b[0m'
};

// Retrieve OS User actual display name on startup (cached)
let osFullName = '';
try {
  const username = os.userInfo().username || process.env.USERNAME || '';
  if (username) {
    if (process.platform === 'win32') {
      try {
        const out = execSync(`wmic useraccount where name="${username}" get fullname`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500 }).toString();
        const lines = out.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 1 && lines[1] && lines[1] !== 'FullName') {
          osFullName = lines[1];
        }
      } catch {
        // Fallback to net user
        try {
          const out = execSync(`net user "${username}"`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500 }).toString();
          const match = out.match(/Full Name\s+(.+)/i);
          if (match && match[1]) {
            osFullName = match[1].trim();
          }
        } catch {}
      }
    } else if (process.platform === 'darwin') {
      try {
        const out = execSync(`id -F`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500 }).toString().trim();
        if (out) osFullName = out;
      } catch {}
    } else {
      try {
        const out = execSync(`getent passwd "${username}"`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500 }).toString();
        const parts = out.split(':');
        if (parts[4]) {
          osFullName = parts[4].split(',')[0].trim();
        }
      } catch {}
    }
  }
} catch {
  // Graceful fallback
}

// Get status code with corresponding colored badge
function formatStatus(status: number): string {
  if (status >= 500) return `${COLOR.ROSE}${status} ERR${COLOR.RESET}`;
  if (status >= 400) return `${COLOR.ROSE}${status} BAD${COLOR.RESET}`;
  if (status >= 300) return `${COLOR.SKY}${status} RED${COLOR.RESET}`;
  return `${COLOR.MINT}${status} OK${COLOR.RESET}`;
}

// Color coding based on HTTP methods
function formatMethod(method: string): string {
  const methodColors: Record<string, string> = {
    GET: COLOR.MINT,
    POST: COLOR.SKY,
    PUT: COLOR.CREAM,
    PATCH: COLOR.PEACH,
    DELETE: COLOR.ROSE
  };
  const color = methodColors[method] || COLOR.RESET;
  return `${color}${method.padEnd(6)}${COLOR.RESET}`;
}

export const customLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const deviceUser = os.userInfo().username || process.env.USERNAME || 'unknown';
  const deviceUserStr = osFullName ? `${deviceUser} (${osFullName})` : deviceUser;

  // We log on request completion/finish so we have access to req.user (populated by auth middleware)
  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown Agent';

    // Parse authenticated user details if present
    const appUser = (req as any).user;
    const userStr = appUser
      ? `${COLOR.SKY}${appUser.name || 'N/A'}${COLOR.RESET} ${COLOR.MUTED}(ID: ${appUser.id || 'N/A'}, Email: ${appUser.email || 'N/A'})${COLOR.RESET}`
      : `${COLOR.MUTED}Anonymous / Unauthenticated${COLOR.RESET}`;

    // Format the timestamp in a readable format
    const timeStr = new Date().toLocaleTimeString();

    console.log(
      `${COLOR.PEACH}┌───[ ${timeStr} ]${'─'.repeat(45)}${COLOR.RESET}\n` +
      `│ ${COLOR.MUTED}Request:${COLOR.RESET}  ${formatMethod(method)} ${COLOR.CREAM}${url}${COLOR.RESET}\n` +
      `│ ${COLOR.MUTED}Status:${COLOR.RESET}   ${formatStatus(res.statusCode)}  ${COLOR.MUTED}(${duration}ms)${COLOR.RESET}\n` +
      `│ ${COLOR.MUTED}Client:${COLOR.RESET}   ${COLOR.SKY}${ip}${COLOR.RESET} ${COLOR.MUTED}on${COLOR.RESET} ${COLOR.CREAM}${deviceUserStr}${COLOR.RESET}\n` +
      `│ ${COLOR.MUTED}Actor:${COLOR.RESET}    ${userStr}\n` +
      `│ ${COLOR.MUTED}Agent:${COLOR.RESET}    ${COLOR.MUTED}${userAgent}${COLOR.RESET}\n` +
      `${COLOR.PEACH}└───────────────────────────────────────────────────────${COLOR.RESET}`
    );
  });

  next();
};
