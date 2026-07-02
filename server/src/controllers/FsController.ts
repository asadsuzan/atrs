import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';

/** Max directory entries returned in one listing (keeps huge folders responsive). */
const MAX_ENTRIES = 2000;

/** On Windows, probe A:–Z: and return the drives that exist. */
function listWindowsDrives(): { name: string; path: string }[] {
  const drives: { name: string; path: string }[] = [];
  for (let c = 65; c <= 90; c++) {
    const letter = String.fromCharCode(c);
    const root = `${letter}:\\`;
    try {
      if (fs.existsSync(root)) drives.push({ name: `${letter}:`, path: root });
    } catch { /* not present */ }
  }
  return drives;
}

/**
 * GET /api/products/browse-dirs?path=<dir>
 *
 * Lists sub-directories of `path` so the product form can offer a folder picker
 * for the local repo path. With no `path`, returns the drive list (Windows) or
 * the filesystem root (POSIX). Only directory names are returned — never file
 * contents — and the caller is already authenticated + active.
 */
export const browseDirs = (req: Request, res: Response, next: NextFunction) => {
  try {
    const isWin = process.platform === 'win32';
    const raw = String(req.query.path || '').trim();
    const home = os.homedir();

    // Root view: on Windows show drives; on POSIX start at "/".
    if (!raw) {
      if (isWin) {
        return res.json({
          path: '', parent: null, sep: path.sep, isRoot: true,
          home, drives: listWindowsDrives(), dirs: [],
        });
      }
      // fall through with current = '/'
    }

    const current = raw ? path.resolve(raw) : '/';

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

    // Parent: null at a real root; '' on Windows so the UI can jump to the drive list.
    const parentResolved = path.dirname(current);
    const atRoot = parentResolved === current;
    const parent = atRoot ? (isWin ? '' : null) : parentResolved;

    res.json({ path: current, parent, sep: path.sep, isRoot: false, home, drives: [], dirs });
  } catch (error) {
    next(error);
  }
};
