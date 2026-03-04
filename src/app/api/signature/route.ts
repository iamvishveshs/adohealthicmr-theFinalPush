import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
});

export async function POST(req: NextRequest) {
  try {
    // Parse request body to get folder
    const body = await req.json().catch(() => ({}));
    const folder = (body as { folder?: string }).folder || 'adohealthicmr/videos';

    const timestamp = Math.round(Date.now() / 1000);
    
    // Parameters for signed upload (must match what Cloudinary expects)
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

    // Return all fields that client expects
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
      { error: 'Failed to generate signature', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}