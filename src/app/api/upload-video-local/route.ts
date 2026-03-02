import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/backend/lib/auth';
import { getVideos } from '@/lib/store';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

// Store videos under public so they are served at /uploads/videos/...
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'videos');
const PLACEHOLDER_PREVIEW = '/images/video-placeholder.svg';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'video';
}

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

    const ext = path.extname(file.name) || '.mp4';
    const baseName = sanitizeFilename(path.basename(file.name, ext));
    const nextVideoId = (() => {
      const existing = getVideos(moduleId, videoType);
      return existing.length > 0 ? Math.max(...existing.map((v) => v.videoId)) + 1 : 1;
    })();
    const filename = `${moduleId}_${videoType}_${nextVideoId}_${Date.now()}_${baseName}${ext}`;

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(bytes));

    // Public URL: same origin, so relative path works for both user and admin
    const fileUrl = `/uploads/videos/${filename}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      previewUrl: PLACEHOLDER_PREVIEW,
      fileName: file.name,
      fileSize: file.size,
      moduleId,
      videoType,
      videoId: nextVideoId,
    });
  } catch (error) {
    console.error('Error uploading video locally:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload video',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
