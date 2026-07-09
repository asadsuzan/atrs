import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { getRepoRoot, isWithinRepoRoot } from '../utils/repoAccess';

/** Max directory entries returned in one listing (keeps huge folders responsive). */
const MAX_ENTRIES = 2000;

/**
 * GET /api/products/browse-dirs?path=<dir>
 *
 * Lists sub-directories of `path` so the product form can offer a folder picker
 * for the local repo path. Browsing is confined to REPO_BROWSE_ROOT (defaults
 * to the OS home dir) — any path outside it is rejected, so an authenticated
 * user can't walk the whole host filesystem. Only directory names are returned,
 * never file contents.
 */
export const browseDirs = (req: Request, res: Response, next: NextFunction) => {
  try {
    const root = getRepoRoot();
    const raw = String(req.query.path || '').trim();

    // Empty / out-of-jail input snaps back to the root rather than erroring, so
    // a stale path in the UI can't wedge the picker.
    const current = raw && isWithinRepoRoot(raw) ? path.resolve(raw) : root;

    let stat: fs.Stats;
    try {
      stat = fs.statSync(current);
    } catch {
      return res.status(400).json({ message: 'Path not found on the server.' });
    }
    if (!stat.isDirectory()) {
      return res.status(400).json({ message: 'That path is a file, not a folder.' });
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return res.status(403).json({ message: 'Cannot read this folder (permission denied).' });
    }

    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name, path: path.join(current, e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .slice(0, MAX_ENTRIES);

    // Never expose a parent above the jail root.
    const atRoot = current === root;
    const parent = atRoot ? null : path.dirname(current);

    res.json({ path: current, parent, sep: path.sep, isRoot: atRoot, home: root, drives: [], dirs });
  } catch (error) {
    next(error);
  }
};
