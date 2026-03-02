import { NextRequest, NextResponse } from 'next/server';
import { getVideos, createVideo } from '@/lib/store';
import { requireAuth, requireAdmin } from '@/backend/lib/auth';
import { isExpressEnabled, proxyToExpress } from '@/lib/express-proxy';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    if (isExpressEnabled()) {
      const { searchParams } = new URL(request.url);
      const q = searchParams.toString();
      const res = await proxyToExpress(`/api/videos${q ? '?' + q : ''}`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const videoType = searchParams.get('videoType');
    const moduleIdNum = moduleId ? parseInt(moduleId) : undefined;
    const videos = getVideos(
      isNaN(moduleIdNum as number) ? undefined : moduleIdNum,
      videoType || undefined
    );
    return NextResponse.json({ success: true, videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

export const POST = requireAdmin(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    if (isExpressEnabled()) {
      const res = await proxyToExpress('/api/videos', {
        method: 'POST',
        body: JSON.stringify({ ...body, uploadedBy: user.userId }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const { moduleId, videoType, videoId, preview, fileName, fileSize, fileUrl, publicId } = body;
    
    // Validate required fields
    if (!moduleId || !videoType || videoId === undefined || !fileName || fileSize === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: moduleId, videoType, videoId, fileName, and fileSize are required' },
        { status: 400 }
      );
    }
    
    // Generate preview from publicId if preview is missing; use placeholder for local fileUrl
    let finalPreview = preview;
    if (!finalPreview && publicId) {
      const { getVideoThumbnail } = await import('@/lib/cloudinary');
      finalPreview = getVideoThumbnail(publicId);
    }
    if (!finalPreview && fileUrl && fileUrl.startsWith('/')) {
      finalPreview = '/images/video-placeholder.svg';
    }
    if (!finalPreview) {
      return NextResponse.json(
        { error: 'Preview is required. Please ensure the video upload completed successfully or provide a publicId to generate preview.' },
        { status: 400 }
      );
    }
    if (!['english', 'punjabi', 'hindi', 'activity'].includes(videoType)) {
      return NextResponse.json(
        { error: 'Invalid video type. Must be: english, punjabi, hindi, or activity' },
        { status: 400 }
      );
    }
    const newVideo = createVideo({
      moduleId,
      videoType,
      videoId,
      preview: finalPreview, // Use generated preview if original was missing
      fileName,
      fileSize,
      fileUrl, // Include fileUrl (Cloudinary secure_url) for video playback
      uploadedBy: user.userId,
    });
    
    // Ensure response includes all video data including fileUrl for immediate preview
    return NextResponse.json(
      { 
        success: true, 
        message: 'Video created successfully', 
        video: {
          ...newVideo,
          // Explicitly include fileUrl in response for frontend preview
          fileUrl: newVideo.fileUrl || fileUrl,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: 'Failed to create video', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
