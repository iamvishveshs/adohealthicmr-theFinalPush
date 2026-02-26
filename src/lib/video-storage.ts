/**
 * Video Storage and Background Upload
 * 
 * Stores videos locally first, then uploads to Cloudinary in the background.
 * This allows users to continue working while uploads happen in the background.
 */

import { uploadVideoDirect } from './cloudinary-direct-upload';
import { UploadProgress } from './cloudinary-direct-upload';

export interface StoredVideo {
  id: string;
  file: File;
  moduleId: number;
  videoType: string;
  fileName: string;
  fileSize: number;
  storedAt: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  uploadProgress?: UploadProgress;
  cloudinaryUrl?: string;
  publicId?: string;
  error?: string;
}

const STORAGE_KEY = 'pending_video_uploads';
const DB_NAME = 'VideoUploadDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

/**
 * Initialize IndexedDB for video storage
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('moduleId', 'moduleId', { unique: false });
        objectStore.createIndex('videoType', 'videoType', { unique: false });
        objectStore.createIndex('uploadStatus', 'uploadStatus', { unique: false });
      }
    };
  });
}

/**
 * Store video file in IndexedDB
 */
export async function storeVideo(
  file: File,
  moduleId: number,
  videoType: string
): Promise<string> {
  const db = await initDB();
  const id = `video_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const storedVideo: StoredVideo = {
    id,
    file,
    moduleId,
    videoType,
    fileName: file.name,
    fileSize: file.size,
    storedAt: Date.now(),
    uploadStatus: 'pending',
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(storedVideo);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get stored video by ID
 */
export async function getStoredVideo(id: string): Promise<StoredVideo | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending uploads
 */
export async function getPendingUploads(): Promise<StoredVideo[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('uploadStatus');
    const request = index.getAll('pending');

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update stored video
 */
export async function updateStoredVideo(video: StoredVideo): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(video);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete stored video
 */
export async function deleteStoredVideo(id: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Upload video in background
 * This function runs in the background and updates progress
 */
export async function uploadVideoInBackground(
  storedVideoId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ success: boolean; video?: any; error?: string }> {
  const storedVideo = await getStoredVideo(storedVideoId);
  
  if (!storedVideo) {
    return { success: false, error: 'Stored video not found' };
  }

  // Update status to uploading
  storedVideo.uploadStatus = 'uploading';
  await updateStoredVideo(storedVideo);

  try {
    // Upload to Cloudinary
    const result = await uploadVideoDirect(
      storedVideo.file,
      storedVideo.moduleId,
      storedVideo.videoType,
      {
        compress: false, // No compression
        onProgress: (progress) => {
          // Update stored video with progress
          storedVideo.uploadProgress = progress;
          updateStoredVideo(storedVideo);
          
          // Call external progress callback
          onProgress?.(progress);
        },
      }
    );

    if (result.success && result.video) {
      // Update stored video with Cloudinary info
      storedVideo.uploadStatus = 'completed';
      storedVideo.cloudinaryUrl = result.video.url;
      storedVideo.publicId = result.video.publicId;
      await updateStoredVideo(storedVideo);

      // Save metadata to backend
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          await fetch('/api/upload-video', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...result.video,
              moduleId: storedVideo.moduleId,
              videoType: storedVideo.videoType,
              fileName: storedVideo.fileName,
              fileSize: storedVideo.fileSize,
            }),
          });
        }
      } catch (metadataError) {
        console.error('Failed to save metadata:', metadataError);
        // Continue even if metadata save fails
      }

      return result;
    } else {
      storedVideo.uploadStatus = 'failed';
      storedVideo.error = result.error;
      await updateStoredVideo(storedVideo);
      return result;
    }
  } catch (error) {
    storedVideo.uploadStatus = 'failed';
    storedVideo.error = error instanceof Error ? error.message : 'Unknown error';
    await updateStoredVideo(storedVideo);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process pending uploads in background
 * Call this to start uploading any pending videos
 */
export async function processPendingUploads(
  onProgress?: (videoId: string, progress: UploadProgress) => void
): Promise<void> {
  const pendingVideos = await getPendingUploads();
  
  // Process uploads sequentially to avoid overwhelming the browser
  for (const video of pendingVideos) {
    await uploadVideoInBackground(video.id, (progress) => {
      onProgress?.(video.id, progress);
    });
  }
}
