/**
 * Direct Cloudinary Upload from Browser
 * 
 * OPTIMIZATIONS:
 * 1. Uploads directly from browser to Cloudinary (bypasses backend)
 * 2. Uses unsigned upload preset for security
 * 3. Chunked upload for large files (>500MB) with retry logic
 * 4. Client-side compression using MediaRecorder API
 * 5. Real-time progress tracking
 * 6. Optimized URLs with q_auto:eco,f_auto
 * 
 * This prevents out-of-memory crashes and speeds up uploads significantly.
 */

export interface UploadProgress {
  stage: 'compressing' | 'uploading' | 'complete';
  progress: number; // 0-100
  message: string;
  compressedSize?: number;
  originalSize?: number;
  uploadedBytes?: number;
  totalBytes?: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  compress?: boolean; // Whether to compress before upload
  quality?: number; // Compression quality 0.1-1.0 (default: 0.6)
  maxRetries?: number; // Number of retry attempts for failed chunks (default: 3)
}

// Cloudinary configuration from environment
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

/**
 * Compress video using browser's MediaRecorder API
 * Processes video in chunks to prevent memory issues
 */
async function compressVideoClient(
  file: File,
  options: { quality?: number } = {}
): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const { quality = 0.6 } = options;
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        let width = video.videoWidth;
        let height = video.videoHeight;
        const aspectRatio = width / height;

        // Limit to 1280x720 for compression
        const maxWidth = 1280;
        const maxHeight = 720;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            width = maxWidth;
            height = Math.round(maxWidth / aspectRatio);
          } else {
            height = maxHeight;
            width = Math.round(maxHeight * aspectRatio);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // MediaRecorder processes video in chunks, preventing memory issues
        const stream = canvas.captureStream(30); // 30 fps
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: Math.round(quality * 2500000),
        });

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          URL.revokeObjectURL(url);
          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          resolve({
            blob: compressedBlob,
            originalSize,
            compressedSize: compressedBlob.size,
          });
        };

        mediaRecorder.onerror = (error) => {
          URL.revokeObjectURL(url);
          reject(new Error(`Compression error: ${error}`));
        };

        video.play();
        mediaRecorder.start();

        const drawFrame = () => {
          if (video.ended || video.paused) {
            mediaRecorder.stop();
            return;
          }
          ctx.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(drawFrame);
        };

        drawFrame();

        video.onended = () => {
          mediaRecorder.stop();
        };
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };

    video.load();
  });
}

/**
 * Upload large file with retry logic
 * Cloudinary handles large files automatically, but we add retry for reliability
 */
async function uploadLargeFileWithRetry(
  file: File,
  folder: string,
  onProgress: (progress: UploadProgress) => void,
  options: { maxRetries?: number } = {}
): Promise<any> {
  const { maxRetries = 3 } = options;
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', folder);
      formData.append('resource_type', 'video');
      // Add optimization parameters
      formData.append('eager', 'q_auto:eco,f_auto');
      formData.append('eager_async', 'true');
      // Enable chunked upload for large files (Cloudinary handles this automatically)
      formData.append('chunk_size', '20000000'); // 20MB chunks

      // Use XMLHttpRequest for progress tracking and retry capability
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress({
              stage: 'uploading',
              progress,
              message: attempt > 0 ? `Retrying upload... ${progress}%` : `Uploading... ${progress}%`,
              originalSize: file.size,
              uploadedBytes: e.loaded,
              totalBytes: e.total,
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (error) {
              reject(new Error('Failed to parse Cloudinary response'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error?.message || `Upload failed: HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed: HTTP ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', CLOUDINARY_UPLOAD_URL);
        xhr.send(formData);
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;
      
      if (attempt < maxRetries) {
        // Exponential backoff: wait 2s, 4s, 8s before retry
        const waitTime = Math.pow(2, attempt) * 1000;
        onProgress({
          stage: 'uploading',
          progress: 0,
          message: `Upload failed, retrying in ${waitTime / 1000}s... (Attempt ${attempt + 1}/${maxRetries})`,
          originalSize: file.size,
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error(`Failed to upload after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Direct upload to Cloudinary from browser
 * 
 * OPTIMIZATION: Uploads directly to Cloudinary, bypassing backend.
 * This is faster and reduces server load.
 */
export async function uploadVideoDirect(
  file: File,
  moduleId: number,
  videoType: string,
  options: UploadOptions = {}
): Promise<{ success: boolean; video?: any; error?: string }> {
  const { onProgress, compress = false, quality = 0.6, maxRetries = 3 } = options;
  const fileSizeMB = file.size / 1024 / 1024;

  // Validate Cloudinary configuration
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return {
      success: false,
      error: 'Cloudinary configuration missing. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local',
    };
  }

  try {
    // Skip client-side compression - upload file directly as-is
    // Cloudinary will handle compression and optimization automatically
    let videoFile = file;
    let compressionInfo = { originalSize: file.size, compressedSize: file.size };

    // Compression is disabled by default - upload file directly
    if (compress && fileSizeMB < 500) {
      onProgress?.({
        stage: 'compressing',
        progress: 0,
        message: `Compressing video (${fileSizeMB.toFixed(2)}MB)...`,
        originalSize: file.size,
      });

      try {
        const compressed = await compressVideoClient(file, { quality });
        videoFile = new File([compressed.blob], file.name.replace(/\.[^/.]+$/, '.webm'), {
          type: 'video/webm',
        });
        compressionInfo = {
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
        };

        const reduction = ((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1);
        onProgress?.({
          stage: 'compressing',
          progress: 100,
          message: `Compression complete: ${reduction}% reduction`,
          ...compressionInfo,
        });
      } catch (compressionError) {
        console.warn('Compression failed, using original file:', compressionError);
        // Continue with original file
      }
    }

    // Step 2: Upload to Cloudinary
    const folder = `adohealthicmr/videos/${moduleId}/${videoType}`;
    let result: any;

    // Upload to Cloudinary (with retry for large files)
    const useRetry = videoFile.size > 500 * 1024 * 1024; // Use retry for files > 500MB

    if (useRetry) {
      onProgress?.({
        stage: 'uploading',
        progress: 0,
        message: 'Uploading large file to Cloudinary...',
        ...compressionInfo,
      });

      result = await uploadLargeFileWithRetry(videoFile, folder, (progress) => {
        onProgress?.({
          ...progress,
          ...compressionInfo,
        });
      }, { maxRetries });
    } else {
      // Standard upload for smaller files
      onProgress?.({
        stage: 'uploading',
        progress: 0,
        message: 'Uploading to Cloudinary...',
        ...compressionInfo,
      });

      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', folder);
      formData.append('resource_type', 'video');
      // Add optimization parameters
      formData.append('eager', 'q_auto:eco,f_auto');
      formData.append('eager_async', 'true');

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      result = await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress?.({
              stage: 'uploading',
              progress,
              message: `Uploading... ${progress}%`,
              ...compressionInfo,
              uploadedBytes: e.loaded,
              totalBytes: e.total,
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (error) {
              reject(new Error('Failed to parse Cloudinary response'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error?.message || 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed: HTTP ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', CLOUDINARY_UPLOAD_URL);
        xhr.send(formData);
      });
    }

    // Generate optimized URL with q_auto:eco,f_auto
    const optimizedUrl = result.secure_url.replace(
      '/upload/',
      '/upload/q_auto:eco,f_auto/'
    );

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Upload complete!',
      ...compressionInfo,
    });

    return {
      success: true,
      video: {
        publicId: result.public_id,
        url: optimizedUrl,
        secure_url: result.secure_url,
        format: result.format,
        duration: result.duration,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        fileName: file.name,
        fileSize: compressionInfo.compressedSize,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
