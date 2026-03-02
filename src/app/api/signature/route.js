import cloudinary from '@/lib/cloudinary';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: 'videos',
        resource_type: 'video'
      },
      process.env.CLOUDINARY_API_SECRET
    );

    return NextResponse.json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY
    });
  } catch (error) {
    console.error('Error generating signature:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
}
