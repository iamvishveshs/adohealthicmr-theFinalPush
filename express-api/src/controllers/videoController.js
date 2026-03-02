import * as videoRepository from '../repositories/videoRepository.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

export async function list(req, res, next) {
  try {
    const moduleId = req.query.moduleId ? parseInt(req.query.moduleId, 10) : undefined;
    const videoType = req.query.videoType;
    const videos = await videoRepository.findAll(
      isNaN(moduleId) ? undefined : moduleId,
      videoType || undefined
    );
    return res.json({ success: true, videos });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const { moduleId, videoType, videoId, preview, fileName, fileSize, fileUrl, uploadedBy } = req.body;
    if (!moduleId || !videoType || videoId === undefined) {
      return res.status(400).json({ error: 'moduleId, videoType, videoId required' });
    }
    const video = await videoRepository.create({
      moduleId, videoType, videoId, preview, fileName, fileSize, fileUrl, uploadedBy,
    });
    return res.status(201).json({ success: true, video });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const moduleId = parseInt(req.params.moduleId, 10);
    const videoType = req.params.videoType;
    const videoId = parseInt(req.params.videoId, 10);
    if (isNaN(moduleId) || !videoType || isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid moduleId, videoType, or videoId' });
    }
    const ok = await videoRepository.remove(moduleId, videoType, videoId);
    if (!ok) return res.status(404).json({ success: false, error: 'Video not found' });
    return res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function upload(req, res, next) {
  try {
    // Expect multer to have populated req.file
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const { moduleId, videoType, videoId, preview, uploadedBy } = req.body;
    if (!moduleId || !videoType || videoId === undefined) {
      return res.status(400).json({ error: 'moduleId, videoType, videoId required' });
    }

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const startTime = Date.now();
    let uploadedBytes = 0;
    
    console.log('[Cloudinary Upload] Starting optimized video upload:', {
      fileName: file.originalname,
      fileSize: `${fileSizeMB}MB`,
      chunkSize: '6MB',
      resourceType: 'video',
    });

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video', // CRITICAL: Must be 'video' for video uploads
          folder: 'videos',
          chunk_size: 6000000, // 6MB chunks for optimal large file uploads
          timeout: 600000, // 10 minutes timeout for large files
        },
        (error, result) => {
          const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
          
          if (error) {
            console.error('[Cloudinary Upload] ❌ Video upload error:', {
              error: error.message,
              http_code: error.http_code,
              uploadTime: `${uploadTime}s`,
              uploadedBytes: `${(uploadedBytes / (1024 * 1024)).toFixed(2)}MB`,
            });
            return reject(error);
          }
          
          console.log('[Cloudinary Upload] ✓ Video upload completed:', {
            publicId: result.public_id,
            fileSize: result.bytes ? `${(result.bytes / (1024 * 1024)).toFixed(2)}MB` : 'unknown',
            uploadTime: `${uploadTime}s`,
            uploadSpeed: `${(fileSizeMB / parseFloat(uploadTime)).toFixed(2)}MB/s`,
            secureUrl: result.secure_url ? result.secure_url.substring(0, 50) + '...' : 'not available',
          });
          
          resolve(result);
        }
      );
      
      // Track upload progress
      const inputStream = streamifier.createReadStream(file.buffer);
      inputStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const progress = Math.round((uploadedBytes / file.size) * 100);
        
        // Log progress every 25%
        if (progress % 25 === 0 || uploadedBytes === file.size) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`[Cloudinary Upload] Progress: ${progress}% (${(uploadedBytes / (1024 * 1024)).toFixed(2)}MB / ${fileSizeMB}MB) - ${elapsed}s elapsed`);
        }
      });
      
      inputStream.pipe(uploadStream);
    });

    // Always prefer secure_url for HTTPS
    const fileUrl = uploadResult.secure_url || uploadResult.url;
    
    console.log('[Cloudinary Upload] ✓ Video metadata saved:', {
      videoId,
      moduleId,
      videoType,
      fileUrl: fileUrl.substring(0, 60) + '...',
      hasSecureUrl: !!uploadResult.secure_url,
    });
    const fileName = file.originalname;
    const fileSize = file.size;

    const video = await videoRepository.create({
      moduleId: parseInt(moduleId, 10),
      videoType,
      videoId: parseInt(videoId, 10),
      preview: preview || '',
      fileName,
      fileSize,
      fileUrl,
      uploadedBy: uploadedBy || null,
    });

    return res.status(201).json({ success: true, video, uploadResult });
  } catch (error) {
    next(error);
  }
}
