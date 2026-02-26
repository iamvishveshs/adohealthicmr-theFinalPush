import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getVideos, createVideo } from '@/lib/store';
import { getVideoThumbnail } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

/**
 * Video metadata endpoint - saves video info after direct Cloudinary upload
 * 
 * NOTE: The actual video upload now happens directly from browser to Cloudinary.
 * This endpoint only saves the video metadata to the database.
 */
export const POST = requireAdmin(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    
    const { 
      publicId, 
      url, 
      secure_url, 
      format, 
      duration, 
      bytes, 
      width, 
      height,
      fileName,
      fileSize,
      moduleId, 
      videoType 
    } = body;

    if (!publicId || !url || !moduleId || !videoType) {
      return NextResponse.json(
        { error: 'Missing required fields: publicId, url, moduleId, videoType' },
        { status: 400 }
      );
    }

    // Validate videoType
    if (!['english', 'punjabi', 'hindi', 'activity'].includes(videoType)) {
      return NextResponse.json(
        { error: 'Invalid video type. Must be: english, punjabi, hindi, or activity' },
        { status: 400 }
      );
    }

    // Get the next videoId for this module and video type
    const moduleIdNum = parseInt(moduleId.toString(), 10);
    const existingVideos = getVideos(moduleIdNum, videoType);
    const nextVideoId = existingVideos.length > 0 
      ? Math.max(...existingVideos.map(v => v.videoId)) + 1 
      : 1;

    // Generate preview thumbnail from Cloudinary
    const preview = getVideoThumbnail(publicId);

    // Generate optimized URL with Cloudinary transformations (if not already optimized)
    const optimizedUrl = url.includes('q_auto:eco,f_auto') 
      ? url 
      : url.replace('/upload/', '/upload/q_auto:eco,f_auto/');

    // Save video metadata to store
    const savedVideo = createVideo({
      moduleId: moduleIdNum,
      videoType: videoType as 'english' | 'punjabi' | 'hindi' | 'activity',
      videoId: nextVideoId,
      preview,
      fileName: fileName || 'video',
      fileSize: fileSize || bytes || 0,
      fileUrl: optimizedUrl,
      uploadedBy: user.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Video metadata saved successfully',
      video: {
        ...savedVideo,
        publicId,
        url: optimizedUrl,
        secure_url: secure_url || url,
        format,
        duration,
        bytes,
        width,
        height,
      },
      moduleId: moduleIdNum,
      videoType,
    });
  } catch (error) {
    console.error('Error saving video metadata:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save video metadata', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
});
