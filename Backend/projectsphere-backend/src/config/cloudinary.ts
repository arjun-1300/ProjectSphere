import { v2 as cloudinary } from 'cloudinary';
import { env, cloudinaryEnabled } from './env.js';

/**
 * Configure the Cloudinary SDK once at startup. If credentials are absent the
 * SDK is left unconfigured and the media service will reject upload attempts
 * with a clear error (features that need it are simply unavailable in dev).
 */
if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export { cloudinary };
