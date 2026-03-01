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

    // Validate required fields - secure_url is preferred but url is acceptable
    if (!publicId || (!url && !secure_url) || !moduleId || !videoType) {
      console.error('[Upload API] Missing required fields:', {
        hasPublicId: !!publicId,
        hasUrl: !!url,
        hasSecureUrl: !!secure_url,
        moduleId,
        videoType,
        body: JSON.stringify(body).substring(0, 200), // Log first 200 chars for debugging
      });
      return NextResponse.json(
        { error: 'Missing required fields: publicId, url (or secure_url), moduleId, videoType' },
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

    // Use secure_url if available, otherwise use url
    const baseUrl = secure_url || url;
    
    // Generate optimized URL with Cloudinary transformations: f_mp4,f_auto,q_auto
    // f_mp4: explicit MP4 format for best compatibility
    // f_auto: automatic format fallback
    // q_auto: automatic quality optimization
    let optimizedUrl = baseUrl;
    if (baseUrl.includes('/upload/')) {
      // Remove any existing transformations
      optimizedUrl = baseUrl.replace(/\/upload\/[^\/]+\//, '/upload/');
      // Apply f_mp4,f_auto,q_auto transformations for full browser compatibility
      optimizedUrl = optimizedUrl.replace('/upload/', '/upload/f_mp4,f_auto,q_auto/');
      
      console.log('[Upload API] URL optimized:', {
        original: baseUrl,
        optimized: optimizedUrl,
        publicId,
      });
    }

    // Save video metadata to store with optimized secure_url
    const savedVideo = createVideo({
      moduleId: moduleIdNum,
      videoType: videoType as 'english' | 'punjabi' | 'hindi' | 'activity',
      videoId: nextVideoId,
      preview,
      fileName: fileName || 'video',
      fileSize: fileSize || bytes || 0,
      fileUrl: optimizedUrl, // Store optimized secure_url for playback
      uploadedBy: user.userId,
    });

    // Return response with secure_url and optimized fileUrl for immediate video preview
    return NextResponse.json({
      success: true,
      message: 'Video metadata saved successfully',
      video: {
        ...savedVideo,
        publicId,
        url: optimizedUrl,
        secure_url: secure_url || url, // Include original secure_url
        fileUrl: optimizedUrl, // Include optimized fileUrl for video playback
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
