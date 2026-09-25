import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let isConfigured = false;

const cleanCloudinaryUrl = (env.CLOUDINARY_URL || process.env.CLOUDINARY_URL)?.replace(/^CLOUDINARY_URL=/, '').trim();

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  isConfigured = true;
} else if (cleanCloudinaryUrl) {
  cloudinary.config({
    cloudinary_url: cleanCloudinaryUrl,
  });
  isConfigured = true;
}

export function isCloudinaryReady(): boolean {
  return isConfigured;
}

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export async function uploadStreamToCloudinary(
  buffer: Buffer,
  folder: string = 'portfolio'
): Promise<CloudinaryUploadResult> {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          logger.error('Cloudinary upload error:', error);
          return reject(error || new Error('Upload to Cloudinary failed'));
        }

        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  if (!isConfigured) return false;
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res.result === 'ok';
  } catch (err) {
    logger.error('Failed to delete from Cloudinary:', err);
    return false;
  }
}

export { cloudinary };
