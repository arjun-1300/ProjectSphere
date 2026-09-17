import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { BadRequestError } from '../shared/errors/AppError.js';

/**
 * File uploads use in-memory storage: files are held as Buffers and streamed
 * straight to Cloudinary, so nothing touches local disk. Type and size limits
 * are enforced here; anything larger/other is rejected before the handler runs.
 */

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PDF_MIME_TYPES = ['application/pdf'];

const MB = 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * MB;
export const MAX_PDF_BYTES = 10 * MB;
export const MAX_GALLERY_FILES = 10;

function mimeFilter(allowed: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Unsupported file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`));
    }
  };
}

const imageUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: mimeFilter(IMAGE_MIME_TYPES),
});

const pdfUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: mimeFilter(PDF_MIME_TYPES),
});

/** Single image field (avatar, cover, project cover, architecture diagram). */
export const singleImage = (field: string) => imageUploader.single(field);

/** Multiple images for the gallery (bounded count). */
export const imageArray = (field: string) => imageUploader.array(field, MAX_GALLERY_FILES);

/** Single PDF field (resume). */
export const singlePdf = (field: string) => pdfUploader.single(field);
