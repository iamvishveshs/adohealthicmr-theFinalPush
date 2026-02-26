/**
 * Streaming video upload utility to prevent out-of-memory crashes
 * 
 * KEY OPTIMIZATIONS:
 * 1. Uses FormData which streams files (doesn't load entire file into memory)
 * 2. Uses XMLHttpRequest for progress tracking (fetch doesn't support upload progress)
 * 3. Client-side compression using MediaRecorder API (optional, for files < 500MB)
 * 4. Server streams directly to Cloudinary using upload_stream (no base64 conversion)
 * 
 * This prevents Chrome "Out of Memory" crashes by never loading the entire file into memory.
 */

export interface UploadProgress {
  stage: 'compressing' | 'uploading' | 'complete';
  progress: number; // 0-100
  message: string;
  compressedSize?: number;
  originalSize?: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  compress?: boolean; // Whether to compress before upload (default: true for files < 500MB)
  quality?: number; // Compression quality 0.1-1.0 (default: 0.6)
}

/**
 * Compress video using browser's MediaRecorder API
 * This is memory-efficient as it processes the video in chunks
 * Only use for files < 500MB to avoid browser memory issues
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

        // Create canvas for video processing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Use MediaRecorder with canvas stream for compression
        // This processes video in chunks, not loading entire file into memory
        const stream = canvas.captureStream(30); // 30 fps
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: Math.round(quality * 2500000), // Adjust bitrate based on quality
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

        // Start recording
        video.play();
        mediaRecorder.start();

        // Draw frames (this processes video in chunks, not all at once)
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
 * Upload video with streaming to prevent out-of-memory crashes
 * 
 * OPTIMIZATION: Uses FormData which streams the file, never loading it fully into memory.
 * The browser sends the file in chunks automatically, preventing memory issues.
 * 
 * @param file - The video file to upload
 * @param moduleId - Module ID
 * @param videoType - Video type (english, punjabi, hindi, activity)
 * @param options - Upload options including progress callback
 */
export async function uploadVideoStream(
  file: File,
  moduleId: number,
  videoType: string,
  options: UploadOptions = {}
): Promise<{ success: boolean; video?: any; error?: string }> {
  const { onProgress, compress = true, quality = 0.6 } = options;
  const fileSizeMB = file.size / 1024 / 1024;

  try {
    // Step 1: Optional client-side compression (only for files < 500MB)
    // This reduces file size before upload, but we skip it for very large files
    // to avoid browser memory issues during compression
    let videoFile = file;
    let compressionInfo = { originalSize: file.size, compressedSize: file.size };

    const shouldCompress = compress && fileSizeMB < 500; // Only compress files < 500MB

    if (shouldCompress) {
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
        // Continue with original file if compression fails
      }
    }

    // Step 2: Stream upload to server
    // OPTIMIZATION: FormData streams the file in chunks automatically.
    // The browser never loads the entire file into memory at once.
    onProgress?.({
      stage: 'uploading',
      progress: 0,
      message: 'Uploading to Cloudinary...',
      ...compressionInfo,
    });

    // Create FormData - this is memory-efficient as it streams the file
    const formData = new FormData();
    formData.append('file', videoFile); // File object is streamed, not loaded into memory
    formData.append('moduleId', moduleId.toString());
    formData.append('videoType', videoType);

    // Get token from localStorage for authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }

    // OPTIMIZATION: Use XMLHttpRequest instead of fetch for upload progress tracking
    // fetch() doesn't support upload progress events, which we need for the progress bar
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      // Track upload progress (this is why we use XHR instead of fetch)
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress?.({
            stage: 'uploading',
            progress,
            message: `Uploading... ${progress}%`,
            ...compressionInfo,
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            onProgress?.({
              stage: 'complete',
              progress: 100,
              message: 'Upload complete!',
              ...compressionInfo,
            });
            resolve({
              success: response.success !== false,
              video: response.video || response,
              compression: response.compression || compressionInfo,
            });
          } catch (error) {
            reject(new Error('Failed to parse server response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || error.error || 'Upload failed'));
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

      // Start upload
      // OPTIMIZATION: The file is streamed in chunks by the browser automatically.
      // We never call file.arrayBuffer() or read the entire file into memory.
      xhr.open('POST', '/api/upload-video');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData); // FormData streams the file, preventing out-of-memory crashes
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
