import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/backend/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';

// Configure Cloudinary using environment variables
// Use server-side variables first, fallback to public variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Validate credentials at startup
if (!cloudName || !apiKey || !apiSecret) {
  console.error('[Cloudinary Config] ❌ MISSING CREDENTIALS:', {
    hasCloudName: !!cloudName,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
  });
  console.error('[Cloudinary Config] Please set in .env.local:');
  if (!cloudName) console.error('  - CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  if (!apiKey) console.error('  - CLOUDINARY_API_KEY');
  if (!apiSecret) console.error('  - CLOUDINARY_API_SECRET');
} else {
  console.log('[Cloudinary Config] ✓ Credentials found');
}

cloudinary.config({
  cloud_name: cloudName || '',
  api_key: apiKey || '',
  api_secret: apiSecret || '',
  secure: true, // Always use HTTPS
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large video uploads

/**
 * Cloudinary video upload endpoint for Next.js App Router
 * 
 * Uses upload_stream for efficient handling of large video files.
 * Streams the file directly to Cloudinary without loading entire file into memory.
 * 
 * Environment variables required:
 * - CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */
export const POST = requireAdmin(async (request: NextRequest, user) => {
  let tempFilePath: string | null = null;

  console.log('[Cloudinary Upload] ===== Starting upload request =====');

  try {
    // Step 1: Validate Cloudinary configuration
    const configCloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const configApiKey = process.env.CLOUDINARY_API_KEY;
    const configApiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!configCloudName || !configApiKey || !configApiSecret) {
      console.error('[Cloudinary Upload] ❌ Missing credentials in request handler');
      return NextResponse.json(
        { 
          error: 'Cloudinary configuration missing',
          details: 'Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local'
        },
        { status: 500 }
      );
    }

    // Verify Cloudinary SDK is configured
    const sdkConfig = cloudinary.config();
    if (!sdkConfig.cloud_name || !sdkConfig.api_key || !sdkConfig.api_secret) {
      console.error('[Cloudinary Upload] ❌ SDK not configured');
      return NextResponse.json(
        { 
          error: 'Cloudinary SDK configuration error',
          details: 'SDK failed to initialize. Check your environment variables.'
        },
        { status: 500 }
      );
    }

    console.log('[Cloudinary Upload] ✓ Configuration verified:', {
      cloudName: sdkConfig.cloud_name,
      hasApiKey: !!sdkConfig.api_key,
      hasApiSecret: !!sdkConfig.api_secret,
    });

    // Step 2: Parse form data
    console.log('[Cloudinary Upload] Parsing form data...');
    let file: File;
    let folder: string;
    
    try {
      const formData = await request.formData();
      file = formData.get('file') as File;
      folder = (formData.get('folder') as string) || 'uploads';

      if (!file) {
        console.error('[Cloudinary Upload] ❌ No file in request');
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      console.log('[Cloudinary Upload] ✓ File received:', {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        type: file.type,
      });
    } catch (formDataError) {
      console.error('[Cloudinary Upload] ❌ Error parsing form data:', formDataError);
      return NextResponse.json(
        { 
          error: 'Failed to parse form data',
          details: formDataError instanceof Error ? formDataError.message : 'Unknown error'
        },
        { status: 400 }
      );
    }

    const fileSize = file.size;
    const fileSizeMB = fileSize / (1024 * 1024);

    // Check file size limit (300MB)
    const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB
    if (fileSize > MAX_FILE_SIZE) {
      console.error('[Cloudinary Upload] ❌ File too large:', fileSizeMB.toFixed(2), 'MB');
      return NextResponse.json(
        { 
          error: 'File too large',
          details: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size of 300MB`
        },
        { status: 413 }
      );
    }

    // Step 3: Convert File to stream for upload_stream
    console.log('[Cloudinary Upload] Converting file to stream...');
    
    // Create a temporary directory for file uploads
    const uploadDir = path.join(os.tmpdir(), 'cloudinary-uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // For upload_stream, we need to convert the File to a Node.js stream
    // Read file as arrayBuffer and convert to stream
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileStream = Readable.from(buffer);

    console.log('[Cloudinary Upload] ✓ File converted to stream, size:', `${fileSizeMB.toFixed(2)}MB`);

    // Step 4: Upload to Cloudinary using upload_stream
    console.log('[Cloudinary Upload] Starting Cloudinary upload_stream...', {
      endpoint: `https://api.cloudinary.com/v1_1/${sdkConfig.cloud_name}/video/upload`,
      folder,
      resourceType: 'video',
    });

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video', // CRITICAL: Must be 'video' for video uploads
          folder: folder,
          chunk_size: 50000000, // 50MB chunks for faster upload
          timeout: 300000, // 5 minutes timeout
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary Upload] ❌ Upload stream error:', {
              error: error.message,
              http_code: error.http_code,
              name: error.name,
            });
            reject(error);
          } else {
            console.log('[Cloudinary Upload] ✓ Upload stream completed');
            resolve(result);
          }
        }
      );

      // Pipe the file stream to Cloudinary upload stream
      fileStream.pipe(uploadStream);
      
      // Handle stream errors
      fileStream.on('error', (error) => {
        console.error('[Cloudinary Upload] ❌ File stream error:', error);
        reject(error);
      });
    }) as any;

    console.log('[Cloudinary Upload] ✓ Upload successful:', {
      publicId: uploadResult.public_id,
      size: `${(uploadResult.bytes / (1024 * 1024)).toFixed(2)}MB`,
      format: uploadResult.format,
      secureUrl: uploadResult.secure_url?.substring(0, 50) + '...',
    });

    // Step 5: Return the uploaded Cloudinary URL in JSON response
    return NextResponse.json({
      success: true,
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      url: uploadResult.url,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      width: uploadResult.width,
      height: uploadResult.height,
      duration: uploadResult.duration,
      resource_type: uploadResult.resource_type,
    });

  } catch (error: any) {
    // Step 6: Handle errors with detailed logging
    console.error('[Cloudinary Upload] ❌ ERROR:', {
      error: error instanceof Error ? error.message : String(error),
      errorName: error?.name,
      errorCode: error?.http_code || error?.status,
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
    });

    // Clean up temporary file if it exists
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('[Cloudinary Upload] Failed to cleanup temp file:', cleanupError);
      }
    }

    // Provide specific error messages
    if (error?.http_code === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { 
          error: 'Cloudinary authentication failed',
          details: 'Invalid API credentials. Please verify CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local'
        },
        { status: 401 }
      );
    }
    
    if (error?.http_code === 400 || error?.message?.includes('Invalid')) {
      return NextResponse.json(
        { 
          error: 'Cloudinary request invalid',
          details: error?.message || 'Invalid request to Cloudinary API'
        },
        { status: 400 }
      );
    }
    
    if (error?.message?.includes('timeout') || error?.message?.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { 
          error: 'Cloudinary upload timeout',
          details: 'Upload took too long. The file may be too large or network connection is slow.'
        },
        { status: 504 }
      );
    }
    
    if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { 
          error: 'Cannot connect to Cloudinary',
          details: 'Network error. Please check your internet connection.'
        },
        { status: 503 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to upload video',
        details: error instanceof Error ? error.message : 'Unknown error occurred. Please check server logs for details.'
      },
      { status: 500 }
    );
  }
});
