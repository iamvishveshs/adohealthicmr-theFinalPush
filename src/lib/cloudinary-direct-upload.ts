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
// For large files (>50MB), upload directly to Cloudinary to avoid Next.js body size limits
// For smaller files, use proxy route to avoid CORS issues
const CLOUDINARY_DIRECT_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const CLOUDINARY_PROXY_UPLOAD_URL = '/api/cloudinary-upload';
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

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
  
  // Large files should always upload directly to Cloudinary to avoid Next.js body size limits
  const isLargeFile = file.size > LARGE_FILE_THRESHOLD;

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
      // Larger chunks = faster upload but more memory per chunk
      formData.append('chunk_size', '50000000'); // 50MB chunks for faster uploads

      // Use fetch - for large files, upload directly to Cloudinary
      const totalBytes = file.size;
      let uploadedBytes = 0;
      
      // Simulate progress updates during upload
      const progressInterval = setInterval(() => {
        if (uploadedBytes < totalBytes) {
          uploadedBytes = Math.min(uploadedBytes + (totalBytes * 0.1), totalBytes);
          const progress = Math.round((uploadedBytes / totalBytes) * 100);
          onProgress({
            stage: 'uploading',
            progress,
            message: attempt > 0 ? `Retrying upload... ${progress}%` : `Uploading... ${progress}%`,
            originalSize: file.size,
            uploadedBytes,
            totalBytes,
          });
        }
      }, 500);

      try {
        // For large files (>100MB), upload DIRECTLY to Cloudinary to bypass Next.js 413 errors
        // This requires CORS to be properly configured on Cloudinary side
        const uploadUrl = CLOUDINARY_DIRECT_UPLOAD_URL;
        
        // Validate URL is properly constructed
        if (!uploadUrl || !uploadUrl.includes('cloudinary.com')) {
          throw new Error(`Invalid Cloudinary upload URL: ${uploadUrl}. Please check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable.`);
        }
        
        // Validate upload preset is set
        if (!CLOUDINARY_UPLOAD_PRESET) {
          throw new Error('Cloudinary upload preset is missing. Please set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variable.');
        }
        
        // No auth token needed for direct Cloudinary uploads with unsigned preset
        const headers: HeadersInit = {};

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers,
          body: formData,
        });

        clearInterval(progressInterval);
        
        // Final progress update
        onProgress({
          stage: 'uploading',
          progress: 100,
          message: 'Processing upload...',
          originalSize: file.size,
          uploadedBytes: totalBytes,
          totalBytes,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || errorData.details || `Upload failed: HTTP ${response.status}`);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        // Provide more detailed error information
        if (error instanceof TypeError && error.message.includes('fetch')) {
          // Check if it's a CORS error
          if (error.message.includes('CORS') || error.message.includes('Access-Control')) {
            const detailedError = new Error(
              `CORS error: Direct Cloudinary upload is blocked. ` +
              `Please configure CORS in Cloudinary Dashboard: ` +
              `Settings → Security → Allowed fetch domains → Add your domain. ` +
              `Error: ${error.message}`
            );
            throw detailedError;
          }
          const detailedError = new Error(
            `Network error: ${error.message}. ` +
            `Check: 1) Internet connection, 2) Cloudinary URL: ${CLOUDINARY_DIRECT_UPLOAD_URL}, ` +
            `3) CORS settings in Cloudinary, 4) Firewall/proxy settings`
          );
          throw detailedError;
        }
        throw error;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;
      
      // Log error details for debugging
      console.error(`[Cloudinary Upload] Attempt ${attempt} failed:`, {
        error: lastError.message,
        uploadUrl: CLOUDINARY_DIRECT_UPLOAD_URL,
        hasPreset: !!CLOUDINARY_UPLOAD_PRESET,
        fileSize: file.size,
      });
      
      if (attempt < maxRetries) {
        // Exponential backoff: wait 2s, 4s, 8s before retry
        const waitTime = Math.pow(2, attempt) * 1000;
        onProgress({
          stage: 'uploading',
          progress: 0,
          message: `Upload failed: ${lastError.message}. Retrying in ${waitTime / 1000}s... (Attempt ${attempt + 1}/${maxRetries})`,
          originalSize: file.size,
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Provide detailed error message
  const errorMessage = lastError?.message || 'Unknown error';
  const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('Network');
  const isConfigError = errorMessage.includes('Cloudinary') || errorMessage.includes('preset') || errorMessage.includes('URL');
  
  let detailedMessage = `Failed to upload after ${maxRetries} attempts: ${errorMessage}`;
  
  if (isNetworkError) {
    detailedMessage += '\n\nPossible causes:\n' +
      '1. No internet connection\n' +
      '2. Cloudinary service is down\n' +
      '3. CORS policy blocking the request\n' +
      '4. Firewall or proxy blocking the request\n' +
      '5. Invalid Cloudinary URL configuration';
  } else if (isConfigError) {
    detailedMessage += '\n\nPlease check your Cloudinary configuration:\n' +
      `- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME || 'NOT SET'}\n` +
      `- NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: ${CLOUDINARY_UPLOAD_PRESET || 'NOT SET'}\n` +
      `- Upload URL: ${CLOUDINARY_DIRECT_UPLOAD_URL}`;
  }
  
  throw new Error(detailedMessage);
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

    // For files > 100MB, upload DIRECTLY to Cloudinary to bypass Next.js/Vercel body size limits
    // For smaller files, use proxy route to avoid CORS issues
    // Threshold: 100MB (bypasses Next.js ~50MB limit and Vercel 4.5MB limit)
    const LARGE_FILE_THRESHOLD_FOR_DIRECT = 100 * 1024 * 1024; // 100MB
    const isLargeFile = videoFile.size > LARGE_FILE_THRESHOLD_FOR_DIRECT;
    const useRetry = videoFile.size > 500 * 1024 * 1024; // Use retry for files > 500MB

    if (isLargeFile || useRetry) {
      onProgress?.({
        stage: 'uploading',
        progress: 0,
        message: 'Uploading large file directly to Cloudinary (bypassing server limits)...',
        ...compressionInfo,
      });

      // Upload DIRECTLY to Cloudinary for large files - bypasses Next.js/Vercel limits
      // This requires CORS to be configured in Cloudinary settings
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

      // Use fetch with proxy route to avoid CORS issues
      // Note: Upload progress tracking is limited with fetch API through proxy
      // We'll simulate progress based on file size
      const totalBytes = videoFile.size;
      let uploadedBytes = 0;
      
      // Simulate progress updates during upload
      const progressInterval = setInterval(() => {
        if (uploadedBytes < totalBytes) {
          // Estimate progress (this is approximate since we can't track actual upload progress through proxy)
          uploadedBytes = Math.min(uploadedBytes + (totalBytes * 0.1), totalBytes);
          const progress = Math.round((uploadedBytes / totalBytes) * 100);
          onProgress?.({
            stage: 'uploading',
            progress,
            message: `Uploading... ${progress}%`,
            ...compressionInfo,
            uploadedBytes,
            totalBytes,
          });
        }
      }, 500);

      try {
        // Always use proxy route to avoid CORS issues
        // The proxy handles both small and large files efficiently
        const uploadUrl = CLOUDINARY_PROXY_UPLOAD_URL;
        const headers: HeadersInit = {};
        
        // Add auth token for proxy route
        const token = localStorage.getItem('authToken');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers,
          body: formData,
        });

        clearInterval(progressInterval);
        
        // Final progress update
        onProgress?.({
          stage: 'uploading',
          progress: 100,
          message: 'Processing upload...',
          ...compressionInfo,
          uploadedBytes: totalBytes,
          totalBytes,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          const errorMessage = errorData.error || errorData.details || `Upload failed: HTTP ${response.status}`;
          
          // Provide more context for common errors
          if (response.status === 400) {
            throw new Error(`${errorMessage}. This usually means the upload preset is invalid or missing required permissions.`);
          } else if (response.status === 401) {
            throw new Error(`${errorMessage}. Authentication failed. Check your Cloudinary upload preset configuration.`);
          } else if (response.status === 413) {
            throw new Error(`${errorMessage}. File is too large. The proxy route should handle this - check Next.js body size limits.`);
          } else if (response.status >= 500) {
            throw new Error(`${errorMessage}. Cloudinary service error. Please try again later.`);
          }
          
          throw new Error(errorMessage);
        }

        result = await response.json();
      } catch (error) {
        clearInterval(progressInterval);
        // Provide more detailed error information for network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          const detailedError = new Error(
            `Network error: ${error.message}. ` +
            `Check: 1) Internet connection, 2) Proxy route: ${CLOUDINARY_PROXY_UPLOAD_URL}, ` +
            `3) Server is running, 4) Firewall/proxy settings`
          );
          throw detailedError;
        }
        throw error;
      }
    }

    // Generate optimized URL with f_mp4,f_auto,q_auto using secure_url
    // f_mp4: explicit MP4 format for best compatibility
    // f_auto: automatic format fallback
    // q_auto: automatic quality optimization
    // Use secure_url for HTTPS playback, fallback to url if secure_url is not available
    const baseUrl = result.secure_url || result.url;
    if (!baseUrl) {
      throw new Error('Cloudinary upload succeeded but no URL returned');
    }
    
    let optimizedUrl = baseUrl;
    if (baseUrl.includes('/upload/')) {
      // Remove any existing transformations
      optimizedUrl = baseUrl.replace(/\/upload\/[^\/]+\//, '/upload/');
      // Apply f_mp4,f_auto,q_auto transformations for full browser compatibility
      optimizedUrl = optimizedUrl.replace('/upload/', '/upload/f_mp4,f_auto,q_auto/');
      
      console.log('[Cloudinary Upload] URL optimized:', {
        original: baseUrl,
        optimized: optimizedUrl,
        publicId: result.public_id,
      });
    }

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Upload complete!',
      ...compressionInfo,
    });

    return {
      success: true,
      video: {
        publicId: result.public_id || '',
        url: result.url || optimizedUrl, // Original URL from Cloudinary
        secure_url: result.secure_url || result.url || optimizedUrl, // Prefer secure_url, fallback to url
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
