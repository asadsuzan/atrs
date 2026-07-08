import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isR2Active, uploadToR2 } from '../utils/r2Storage';
import { isServerless } from '../utils/appConfig';

const router = Router();

const uploadDir = path.join(__dirname, '../../../uploads');

// Serverless filesystems are read-only — local disk storage is unavailable
// there, so don't try to create the uploads dir (R2 is required instead).
if (!isServerless() && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allow-listed media types. SVG is intentionally excluded (XSS vector).
const ALLOWED_MIME_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/ogg',
]);

const ALLOWED_EXTENSIONS = new Set<string>([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.mp4',
  '.webm',
  '.ogg',
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const makeFilename = (originalname: string) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return uniqueSuffix + path.extname(originalname).toLowerCase();
};

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, makeFilename(file.originalname));
  },
});

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  if (ALLOWED_MIME_TYPES.has(mime) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    // Reject with a clear, surfaceable error.
    cb(new Error(`Unsupported file type: ${mime || ext || 'unknown'}. Allowed: png, jpg, jpeg, gif, webp, mp4, webm, ogg.`));
  }
};

const uploadToDisk = multer({
  storage: diskStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// R2 uploads buffer in memory, then stream to the bucket via the S3 API.
const uploadToMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

router.post('/', (req: Request, res: Response) => {
  // Resolved per-request so an admin can switch backends without a restart.
  const useR2 = isR2Active();
  if (!useR2 && isServerless()) {
    return res.status(400).json({
      message:
        'Local disk storage is not available on this deployment. Configure Cloudflare R2 in Settings → Storage.',
    });
  }
  const upload = useR2 ? uploadToMemory : uploadToDisk;

  upload.single('file')(req, res, async (err: any) => {
    if (err) {
      // Surface multer/file-filter errors as JSON 400 instead of a 500.
      if (err instanceof multer.MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File too large. Maximum size is 25MB.'
            : err.message;
        return res.status(400).json({ message });
      }
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (useR2) {
      try {
        const key = makeFilename(req.file.originalname);
        const url = await uploadToR2(req.file.buffer, key, req.file.mimetype);
        return res.status(200).json({ url });
      } catch (uploadErr) {
        console.error('Cloudflare R2 upload failed:', uploadErr);
        return res.status(502).json({
          message: 'Upload to Cloudflare R2 failed. Check the storage settings and bucket credentials.',
        });
      }
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  });
});

export default router;
