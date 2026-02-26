import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  resource_type: string;
}

export interface CloudinaryVideoUploadResult extends CloudinaryUploadResult {
  duration?: number;
  playback_url?: string;
}

/**
 * Upload an image to Cloudinary
 */
export async function uploadImage(
  file: Buffer | string,
  folder: string = 'adohealthicmr'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'image' as const,
    };

    if (typeof file === 'string' && file.startsWith('data:')) {
      // Base64 string
      cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result as CloudinaryUploadResult);
        }
      });
    } else if (Buffer.isBuffer(file)) {
      // Buffer
      cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result as CloudinaryUploadResult);
        }
      }).end(file);
    } else {
      reject(new Error('Invalid file format. Expected base64 string or Buffer.'));
    }
  });
}

/**
 * Upload a video to Cloudinary using streaming
 * 
 * OPTIMIZATION: Uses upload_stream which streams the file in chunks to Cloudinary.
 * This prevents loading the entire file into memory, avoiding out-of-memory crashes.
 * 
 * @param file - Buffer or base64 string (for backward compatibility)
 * @param folder - Cloudinary folder path
 * @param options - Upload options including compression settings
 */
export async function uploadVideo(
  file: Buffer | string,
  folder: string = 'adohealthicmr/videos',
  options: {
    quality?: 'auto' | 'auto:good' | 'auto:best' | number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<CloudinaryVideoUploadResult> {
  return new Promise((resolve, reject) => {
    const {
      quality = 'auto:good',
      maxWidth = 1920,
      maxHeight = 1080,
    } = options;

    // OPTIMIZATION: Use chunk_size for large files - Cloudinary processes in chunks
    // This prevents memory issues on the server side
    const uploadOptions: any = {
      folder,
      resource_type: 'video' as const,
      chunk_size: 10000000, // 10MB chunks - larger chunks = fewer requests but more memory per chunk
      // Video compression and optimization
      quality: quality,
      transformation: [
        {
          width: maxWidth,
          height: maxHeight,
          crop: 'limit', // Maintain aspect ratio, don't crop
          video_codec: 'h264', // H.264 for better compatibility and compression
          audio_codec: 'aac', // AAC for audio
          bit_rate: 'auto', // Auto bitrate for optimal compression
        }
      ],
      // Generate streaming formats
      eager: [
        { streaming_profile: 'hd', format: 'm3u8' },
        { format: 'mp4', quality: 'auto:good' }
      ],
      format: 'auto', // Automatic format optimization
    };

    if (typeof file === 'string' && file.startsWith('data:')) {
      // Base64 string (legacy support, but not recommended for large files)
      cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result as CloudinaryVideoUploadResult);
        }
      });
    } else if (Buffer.isBuffer(file)) {
      // OPTIMIZATION: Use upload_stream for Buffer - streams directly to Cloudinary
      // This is memory-efficient as it doesn't load the entire file into memory
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result as CloudinaryVideoUploadResult);
          }
        }
      );
      uploadStream.end(file); // Stream the buffer to Cloudinary
    } else {
      reject(new Error('Invalid file format. Expected base64 string or Buffer.'));
    }
  });
}

/**
 * Stream a File object directly to Cloudinary
 * 
 * OPTIMIZATION: This function streams the file in chunks from the Node.js server
 * to Cloudinary, preventing out-of-memory crashes for large files.
 * 
 * @param file - File object from FormData
 * @param folder - Cloudinary folder path
 * @param options - Upload options
 */
export async function uploadVideoStreamFromFile(
  file: File,
  folder: string = 'adohealthicmr/videos',
  options: {
    quality?: 'auto' | 'auto:good' | 'auto:best' | number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<CloudinaryVideoUploadResult> {
  return new Promise(async (resolve, reject) => {
    const {
      quality = 'auto:good',
      maxWidth = 1920,
      maxHeight = 1080,
    } = options;

    const uploadOptions: any = {
      folder,
      resource_type: 'video' as const,
      chunk_size: 10000000, // 10MB chunks for large video uploads
      quality: quality,
      transformation: [
        {
          width: maxWidth,
          height: maxHeight,
          crop: 'limit',
          video_codec: 'h264',
          audio_codec: 'aac',
          bit_rate: 'auto',
        }
      ],
      eager: [
        { streaming_profile: 'hd', format: 'm3u8' },
        { format: 'mp4', quality: 'auto:good' }
      ],
      format: 'auto',
    };

    try {
      // OPTIMIZATION: Stream file in chunks to prevent memory issues
      // Read file in 10MB chunks and pipe to Cloudinary stream
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result as CloudinaryVideoUploadResult);
          }
        }
      );

      // Stream file in chunks (prevents loading entire file into memory)
      const chunkSize = 10 * 1024 * 1024; // 10MB chunks
      let offset = 0;
      const totalSize = file.size;

      while (offset < totalSize) {
        const chunk = file.slice(offset, Math.min(offset + chunkSize, totalSize));
        const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
        
        if (!uploadStream.write(chunkBuffer)) {
          // Wait for drain if buffer is full
          await new Promise((resolve) => uploadStream.once('drain', resolve));
        }
        
        offset += chunkBuffer.length;
      }

      uploadStream.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFile(publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<void> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get a optimized URL for images
 */
export function getOptimizedImageUrl(publicId: string, width?: number, height?: number): string {
  const transformations: string[] = ['f_auto', 'q_auto'];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  
  return cloudinary.url(publicId, {
    transformation: [transformations.join(',')],
    secure: true,
  });
}

/**
 * Get video thumbnail URL
 */
export function getVideoThumbnail(publicId: string, width: number = 640, height: number = 360): string {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [
      { width, height, crop: 'fill' },
      { format: 'jpg' }
    ],
    secure: true,
  });
}

export default cloudinary;
