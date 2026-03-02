/**
 * Direct Cloudinary Upload from Browser
 * 
 * OPTIMIZATIONS:
 * 1. Uploads directly from browser to Cloudinary (bypasses backend completely)
 * 2. Uses signed upload for security (signature generated server-side)
 * 3. Supports large files (500MB+) without server timeout issues
 * 4. Client-side compression using MediaRecorder API (optional)
 * 5. Real-time progress tracking with XMLHttpRequest
 * 6. Uses Cloudinary /auto/upload endpoint for automatic resource type detection
 * 
 * This prevents server timeout issues and speeds up uploads significantly.
 * The server only generates signatures, never handles file uploads.
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
      formData.append('folder', folder);
      formData.append('resource_type', 'video');

      // Use proxy route to avoid CORS issues
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
        // All uploads go through the Next.js proxy route to avoid CORS issues
        // The proxy endpoint uses formidable and can handle files up to 300MB
        const uploadUrl = '/api/cloudinary-upload';
        
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
          const detailedError = new Error(
            `Network error: ${error.message}. ` +
            `Check: 1) Internet connection, 2) Proxy route: /api/cloudinary-upload, ` +
            `3) Server is running, 4) Firewall/proxy settings`
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
        uploadUrl: '/api/cloudinary-upload',
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
      `- CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET'}\n` +
      `- CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'}\n` +
      `- Proxy URL: /api/cloudinary-upload`;
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
  // Note: The proxy endpoint uses API credentials (server-side), so we only need to check cloud name
  if (!CLOUDINARY_CLOUD_NAME) {
    return {
      success: false,
      error: 'Cloudinary configuration missing. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env.local',
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

    // Step 2: Upload directly to Cloudinary using signed upload
    // This bypasses the server completely, preventing timeout issues with large files (500MB+)
    const folder = `adohealthicmr/videos/${moduleId}/${videoType}`;
    
    onProgress?.({
      stage: 'uploading',
      progress: 0,
      message: 'Preparing direct upload to Cloudinary...',
      ...compressionInfo,
    });

    try {
      // Step 2a: Get signed upload signature from server
      // Use the dedicated signature endpoint for better separation of concerns
      let signatureResponse: Response;
      try {
        // Get auth token for authenticated request
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        signatureResponse = await fetch('/api/signature', {
          method: 'POST',
          headers,
          body: JSON.stringify({ folder }),
        });
      } catch (fetchError) {
        // Handle connection errors (server not running, network issues)
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          throw new Error('Cannot connect to server. Please ensure the development server is running on localhost:3000');
        }
        throw fetchError;
      }

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json().catch(() => ({ error: 'Failed to get signature' }));
        throw new Error(errorData.error || errorData.details || 'Failed to get upload signature');
      }

      const { timestamp, signature, cloudName, apiKey } = await signatureResponse.json();

      if (!cloudName || !apiKey || !signature || !timestamp) {
        throw new Error('Invalid signature response from server');
      }

      console.log('[Cloudinary Direct Upload] ✓ Signature obtained, starting direct upload:', {
        folder,
        fileSize: `${(videoFile.size / (1024 * 1024)).toFixed(2)}MB`,
        cloudName,
      });

      // Step 2b: Upload directly to Cloudinary using /auto/upload endpoint
      // This endpoint automatically detects resource type (video) and handles large files efficiently
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('resource_type', 'video'); // Explicitly set to video

      // Use XMLHttpRequest for accurate progress tracking
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const startTime = Date.now();
        let lastProgress = 0;

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            
            // Update progress callback
            onProgress?.({
              stage: 'uploading',
              progress,
              message: `Uploading to Cloudinary... ${progress}%`,
              ...compressionInfo,
              uploadedBytes: event.loaded,
              totalBytes: event.total,
            });

            // Log progress every 10%
            if (progress - lastProgress >= 10 || progress === 100) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              const speed = event.loaded > 0 ? ((event.loaded / (1024 * 1024)) / parseFloat(elapsed)).toFixed(2) : '0';
              console.log(`[Cloudinary Direct Upload] Progress: ${progress}% (${(event.loaded / (1024 * 1024)).toFixed(2)}MB / ${(event.total / (1024 * 1024)).toFixed(2)}MB) - ${elapsed}s - ${speed}MB/s`);
              lastProgress = progress;
            }
          }
        });

        // Handle successful upload
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
              
              console.log('[Cloudinary Direct Upload] ✓ Upload completed:', {
                publicId: response.public_id,
                fileSize: response.bytes ? `${(response.bytes / (1024 * 1024)).toFixed(2)}MB` : 'unknown',
                uploadTime: `${uploadTime}s`,
                uploadSpeed: response.bytes ? `${((response.bytes / (1024 * 1024)) / parseFloat(uploadTime)).toFixed(2)}MB/s` : 'unknown',
                secureUrl: response.secure_url ? response.secure_url.substring(0, 50) + '...' : 'not available',
              });

              onProgress?.({
                stage: 'complete',
                progress: 100,
                message: 'Upload complete!',
                ...compressionInfo,
                uploadedBytes: videoFile.size,
                totalBytes: videoFile.size,
              });

              resolve(response);
            } catch (parseError) {
              reject(new Error('Failed to parse Cloudinary response'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error?.message || `Upload failed: HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed: HTTP ${xhr.status}`));
            }
          }
        });

        // Handle upload errors
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload. Please check your internet connection.'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was cancelled'));
        });

        // Start upload
        xhr.open('POST', uploadUrl);
        xhr.send(formData);
      });

      return {
        success: true,
        video: {
          publicId: result.public_id || '',
          url: result.url || result.secure_url || '',
          secure_url: result.secure_url || result.url || '', // Always prefer secure_url
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
      console.error('[Cloudinary Direct Upload] ❌ Upload error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific error types
        if (errorMessage.includes('Cannot connect to server') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = 'Server connection error: The development server is not running. Please start it with "npm run dev" and try again.';
        } else if (errorMessage.includes('CORS') || errorMessage.includes('Access-Control')) {
          errorMessage = 'CORS error: Please configure Cloudinary CORS settings to allow uploads from your domain.';
        } else if (errorMessage.includes('signature')) {
          errorMessage = 'Signature error: Failed to generate upload signature. Please try again.';
        } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
          errorMessage = 'Network error: Please check your internet connection and ensure the server is running.';
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
