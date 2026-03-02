import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/backend/lib/auth';
import { getVideos } from '@/lib/store';
import { uploadVideoStreamFromFile, getVideoThumbnail } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = requireAdmin(async (request: NextRequest, user) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const moduleIdStr = formData.get('moduleId') as string | null;
    const videoType = formData.get('videoType') as string | null;

    if (!file || !moduleIdStr || !videoType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, moduleId, videoType' },
        { status: 400 }
      );
    }

    if (!['english', 'punjabi', 'hindi', 'activity'].includes(videoType)) {
      return NextResponse.json(
        { error: 'Invalid video type. Must be: english, punjabi, hindi, or activity' },
        { status: 400 }
      );
    }

    const moduleId = parseInt(moduleIdStr, 10);
    if (isNaN(moduleId) || moduleId < 1) {
      return NextResponse.json({ error: 'Invalid moduleId' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Determine next videoId for this module/videoType
    const existing = getVideos(moduleId, videoType);
    const nextVideoId =
      existing.length > 0 ? Math.max(...existing.map((v) => v.videoId)) + 1 : 1;

    // Upload directly to Cloudinary using upload_stream with resource_type: "video"
    // Store in folder: adohealthicmr/videos/{moduleId}/{language}
    const folder = `adohealthicmr/videos/${moduleId}/${videoType}`;
    const uploadResult = await uploadVideoStreamFromFile(file, folder, {
      quality: 'auto:good',
      maxWidth: 1920,
      maxHeight: 1080,
    });

    const secureUrl = uploadResult.secure_url || uploadResult.url;
    if (!secureUrl) {
      return NextResponse.json(
        { error: 'Upload to Cloudinary succeeded but no URL was returned' },
        { status: 500 }
      );
    }

    // Generate a Cloudinary thumbnail for preview
    const previewUrl = getVideoThumbnail(uploadResult.public_id, 640, 360);

    return NextResponse.json({
      success: true,
      secure_url: secureUrl,
      fileUrl: secureUrl,
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
      moduleId,
      videoType,
      videoId: nextVideoId,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload video',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
