import { cloudinary } from '../../config/cloudinary.js';
import { cloudinaryEnabled, env } from '../../config/env.js';
import { BadRequestError } from '../../shared/errors/AppError.js';

/**
 * Thin wrapper over Cloudinary. Uploads accept a Buffer (from multer memory
 * storage), convert it to a data URI, and push it to Cloudinary with sensible
 * transforms. Every stored asset keeps its `public_id` so we can delete it later.
 */

export interface UploadedAsset {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

type ImageKind = 'avatar' | 'cover' | 'project-cover' | 'gallery' | 'architecture';

function ensureEnabled(): void {
  if (!cloudinaryEnabled) {
    throw new BadRequestError(
      'Media uploads are not configured on this server (missing Cloudinary credentials).',
    );
  }
}

function toDataUri(file: Express.Multer.File): string {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

// Per-kind transformations. Images are normalized to WebP and resized so the
// stored asset is web-optimized regardless of the original upload.
const IMAGE_TRANSFORMS: Record<ImageKind, Record<string, unknown>> = {
  avatar: { width: 400, height: 400, crop: 'fill', gravity: 'face', fetch_format: 'webp', quality: 'auto' },
  cover: { width: 1500, height: 500, crop: 'fill', fetch_format: 'webp', quality: 'auto' },
  'project-cover': { width: 1200, height: 675, crop: 'fill', fetch_format: 'webp', quality: 'auto' },
  gallery: { width: 1600, crop: 'limit', fetch_format: 'webp', quality: 'auto' },
  architecture: { width: 2000, crop: 'limit', fetch_format: 'webp', quality: 'auto' },
};

export const mediaService = {
  async uploadImage(file: Express.Multer.File, kind: ImageKind, ownerId: string): Promise<UploadedAsset> {
    ensureEnabled();
    const result = await cloudinary.uploader.upload(toDataUri(file), {
      folder: `${env.CLOUDINARY_FOLDER}/${kind}`,
      resource_type: 'image',
      transformation: IMAGE_TRANSFORMS[kind],
      // Namespacing by owner keeps the media library tidy and debuggable.
      context: { owner: ownerId },
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
    };
  },

  async uploadPdf(file: Express.Multer.File, ownerId: string): Promise<UploadedAsset> {
    ensureEnabled();
    // PDFs are stored as `raw` resources (no image transform pipeline).
    const result = await cloudinary.uploader.upload(toDataUri(file), {
      folder: `${env.CLOUDINARY_FOLDER}/resume`,
      resource_type: 'raw',
      context: { owner: ownerId },
    });
    return { url: result.secure_url, publicId: result.public_id, bytes: result.bytes, format: result.format };
  },

  /** Delete an asset by public_id. Never throws — deletion is best-effort. */
  async deleteAsset(publicId: string | null | undefined, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
    if (!publicId || !cloudinaryEnabled) return;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Failed to delete Cloudinary asset ${publicId}:`, err);
    }
  },
};
