import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../../config/env';
import { BadRequestError } from '../../core/errors';
import { asyncHandler, created } from '../../core/http';
import { authenticate, requireRole, verifyAccountState } from '../../middlewares/auth.middleware';

export const uploadRouter: Router = Router();

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadRoot, { recursive: true });

/** Only formats a browser can render, and only ones we can safely serve. */
const ALLOWED_MIME = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // One folder per month keeps directory listings manageable.
    const bucket = new Date().toISOString().slice(0, 7);
    const target = path.join(uploadRoot, bucket);
    fs.mkdirSync(target, { recursive: true });
    cb(null, target);
  },
  filename: (_req, file, cb) => {
    // The client's filename is never trusted: it can carry path traversal
    // (`../../`) or a double extension (`x.png.html`). We mint our own.
    const extension = ALLOWED_MIME.get(file.mimetype) ?? '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new BadRequestError(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

function toPublicUrl(file: Express.Multer.File): string {
  const relative = path.relative(uploadRoot, file.path).split(path.sep).join('/');
  return `${env.PUBLIC_URL}/${env.UPLOAD_DIR}/${relative}`;
}

uploadRouter.post(
  '/images',
  authenticate,
  verifyAccountState,
  requireRole('ADMIN'),
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw new BadRequestError('No files received');

    created(
      res,
      files.map((file) => ({
        url: toPublicUrl(file),
        size: file.size,
        mimeType: file.mimetype,
      })),
    );
  }),
);
