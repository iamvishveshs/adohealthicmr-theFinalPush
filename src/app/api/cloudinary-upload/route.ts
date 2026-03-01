import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/backend/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large video uploads

/**
 * Proxy endpoint for Cloudinary video uploads
 * 
 * This endpoint proxies video uploads from the browser to Cloudinary,
 * avoiding CORS issues by handling the upload server-side.
 * 
 * ⚠️ IMPORTANT: This endpoint has size limitations:
 * - Next.js App Router: ~50MB body size limit
 * - Vercel: 4.5MB body size limit
 * 
 * For files > 100MB, the client automatically uses direct Cloudinary upload
 * to bypass these limits. This proxy is only used for smaller files.
 * 
 * NOTE: Next.js App Router doesn't support bodyParser config like Pages Router.
 * The body size limit is hardcoded in Next.js and cannot be increased via config.
 */
export const POST = requireAdmin(async (request: NextRequest, user) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadPreset = formData.get('upload_preset') as string;
    const folder = formData.get('folder') as string;
    const resourceType = formData.get('resource_type') as string || 'video';
    const eager = formData.get('eager') as string;
    const eagerAsync = formData.get('eager_async') as string;
    const chunkSize = formData.get('chunk_size') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!uploadPreset) {
      return NextResponse.json(
        { error: 'Upload preset is required' },
        { status: 400 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      return NextResponse.json(
        { error: 'Cloudinary cloud name not configured' },
        { status: 500 }
      );
    }

    const fileSize = file.size;
    const fileSizeMB = fileSize / (1024 * 1024);
    
    console.log(`[Cloudinary Upload] Processing file: ${file.name}, size: ${fileSizeMB.toFixed(2)}MB`);

    // ⚠️ IMPORTANT: Next.js App Router has body size limits:
    // - Development: ~50MB
    // - Vercel: 4.5MB hard limit
    // 
    // For files > 100MB, the client should use direct Cloudinary upload.
    // This proxy route is only for smaller files.
    if (fileSize > 100 * 1024 * 1024) {
      console.warn(`[Cloudinary Upload] File is ${fileSizeMB.toFixed(2)}MB. Large files should use direct Cloudinary upload to avoid 413 errors.`);
      return NextResponse.json(
        { 
          error: 'File too large for proxy route',
          details: `Files larger than 100MB must use direct Cloudinary upload. This file is ${fileSizeMB.toFixed(2)}MB. The client will automatically retry with direct upload.`
        },
        { status: 413 }
      );
    }

    // Pass the File object directly to Cloudinary without loading into memory
    // This prevents 413 errors by letting Cloudinary handle the streaming
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file); // File object streams automatically
    cloudinaryFormData.append('upload_preset', uploadPreset);
    if (folder) cloudinaryFormData.append('folder', folder);
    cloudinaryFormData.append('resource_type', resourceType); // Ensure resource_type is 'video'
    if (eager) cloudinaryFormData.append('eager', eager);
    if (eagerAsync) cloudinaryFormData.append('eager_async', eagerAsync);
    if (chunkSize) cloudinaryFormData.append('chunk_size', chunkSize);

    // Upload directly to Cloudinary from server
    // This creates a new request from server to Cloudinary, bypassing Next.js body limits
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    
    console.log(`[Cloudinary Upload] Uploading to Cloudinary: ${file.name}`);
    
    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: cloudinaryFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cloudinary Upload] Upload error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 500),
      });
      return NextResponse.json(
        { 
          error: 'Cloudinary upload failed',
          details: errorText.substring(0, 500)
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[Cloudinary Upload] Upload successful:', {
      publicId: result.public_id,
      size: result.bytes,
      format: result.format,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Cloudinary Upload] Error proxying upload:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});
