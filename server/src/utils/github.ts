import createHttpError from './httpError';

/**
 * Thin GitHub REST client (fetch-based, no SDK) used by the release sync.
 *
 * Designed for the cases ATRS actually has: repos that may be **private** and/or
 * owned by an **organization**. The API path is identical for public, private,
 * and org repos — access is purely a function of the caller's token scopes:
 *   - Classic PAT: needs the `repo` scope to read private/org repos.
 *   - Fine-grained PAT: needs "Contents: Read-only" (and the org must allow it,
 *     plus SSO authorization for SSO-protected orgs).
 *
 * Self-hosted GitHub Enterprise is supported via GITHUB_API_URL.
 */

const API_BASE = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, '');
const UA = 'ATRS/1.0 (+https://bplugins.com)';
const TIMEOUT_MS = 10000;

export interface GitHubRelease {
  id: number;
  tagName: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  publishedAt: string | null;
  author: string;
  htmlUrl: string;
}

/** Parses an owner/repo pair out of a github.com URL (or `owner/repo` shorthand). */
export function parseRepo(githubUrl: string | undefined | null): { owner: string; repo: string } | null {
  if (!githubUrl) return null;
  const trimmed = githubUrl.trim();
  // Accept full URLs (https/ssh) and bare "owner/repo".
  const m = trimmed.match(
    /(?:github\.com[/:])?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i,
  );
  if (!m) return null;
  const owner = m[1];
  const repo = m[2];
  // Guard against matching a single bare segment as the "repo".
  if (!owner || !repo || owner.toLowerCase() === 'github.com') return null;
  return { owner, repo };
}

async function ghFetch(token: string, path: string): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': UA,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

/** Maps a non-OK GitHub response to a user-facing HttpError. */
function raiseForStatus(res: Response, context: string): never {
  if (res.status === 401) {
    throw createHttpError(401, 'GitHub token is invalid or expired. Reconnect in Settings.');
  }
  if (res.status === 403) {
    // Either rate limiting or — common with org repos — the token lacks scope or
    // hasn't been SSO-authorized for the organization.
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      throw createHttpError(429, 'GitHub API rate limit reached. Try again later.');
    }
    throw createHttpError(
      403,
      'GitHub denied access. For an organization repo, authorize the token for SSO and ensure it has repo (or Contents: Read) scope.',
    );
  }
  if (res.status === 404) {
    throw createHttpError(404, `${context} not found, or the connected token cannot access it (private/org repo without scope).`);
  }
  throw createHttpError(502, `GitHub API error (${res.status}) while fetching ${context}.`);
}

/** Validates a token and returns the authenticated user's login. */
export async function getAuthenticatedUser(token: string): Promise<{ login: string }> {
  const res = await ghFetch(token, '/user');
  if (!res.ok) raiseForStatus(res, 'GitHub user');
  const data: any = await res.json();
  return { login: String(data.login) };
}

/**
 * Lists releases for owner/repo (paginated, up to `maxPages` of 100).
 * Drafts are excluded — they aren't real releases yet.
 */
export async function listReleases(
  token: string,
  owner: string,
  repo: string,
  maxPages = 5,
): Promise<GitHubRelease[]> {
  const out: GitHubRelease[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await ghFetch(token, `/repos/${owner}/${repo}/releases?per_page=100&page=${page}`);
    if (!res.ok) raiseForStatus(res, `repository ${owner}/${repo}`);
    const batch: any[] = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const r of batch) {
      if (r.draft) continue;
      out.push({
        id: r.id,
        tagName: r.tag_name || '',
        name: r.name || r.tag_name || '',
        body: r.body || '',
        draft: !!r.draft,
        prerelease: !!r.prerelease,
        publishedAt: r.published_at || r.created_at || null,
        author: r.author?.login || '',
        htmlUrl: r.html_url || '',
      });
    }
    if (batch.length < 100) break;
  }
  return out;
}
