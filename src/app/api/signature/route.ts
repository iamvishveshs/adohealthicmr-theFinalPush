import cloudinary from '@/lib/cloudinary';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/backend/lib/auth';

/**
 * Generate signed upload signature for direct Cloudinary uploads
 * 
 * Requires admin authentication for security.
 * Supports folder parameter via query string or request body
 * Example: GET /api/signature?folder=adohealthicmr/videos/1/english
 */
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'adohealthicmr/videos';
    
    const timestamp = Math.round(Date.now() / 1000);
    
    const params = {
      timestamp: timestamp.toString(),
      folder: folder,
      resource_type: 'video',
    };
    
    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET || ''
    );

    console.log('[Cloudinary Signature] ✓ Signature generated:', {
      folder,
      resourceType: 'video',
      timestamp,
    });

    return NextResponse.json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    });
  } catch (error) {
    console.error('[Cloudinary Signature] ❌ Error generating signature:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
});

export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const folder = (body as { folder?: string }).folder || 'adohealthicmr/videos';
    
    const timestamp = Math.round(Date.now() / 1000);
    
    const params = {
      timestamp: timestamp.toString(),
      folder: folder,
      resource_type: 'video',
    };
    
    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET || ''
    );

    console.log('[Cloudinary Signature] ✓ Signature generated:', {
      folder,
      resourceType: 'video',
      timestamp,
    });

    return NextResponse.json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    });
  } catch (error) {
    console.error('[Cloudinary Signature] ❌ Error generating signature:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
});
