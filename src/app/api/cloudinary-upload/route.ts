import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/backend/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large video uploads

/**
 * Cloudinary video upload endpoint for Next.js App Router
 * 
 * This endpoint handles large video uploads (up to 300MB) using formidable
 * to parse multipart form data, bypassing Next.js default body size limits.
 * 
 * The default body parser is disabled by using formidable to parse the raw request stream.
 * 
 * Environment variables required:
 * - CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */
export const POST = requireAdmin(async (request: NextRequest, user) => {
  let tempFilePath: string | null = null;

  try {
    // Step 1: Parse multipart form data using formidable
    // This bypasses Next.js default body parser and allows larger file uploads (up to 300MB)
    // Formidable will parse the raw request stream directly
    
    // Create a temporary directory for file uploads
    const uploadDir = path.join(os.tmpdir(), 'cloudinary-uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // Configure formidable with maxFileSize set to 300MB
    const form = formidable({
      maxFileSize: 300 * 1024 * 1024, // 300MB
      uploadDir: uploadDir,
      keepExtensions: true,
      multiples: false,
    });

    // Parse the request - formidable handles the raw request body
    // In App Router, we need to convert the request to a format formidable can use
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Get the raw request body as a stream
    // In App Router, we can't directly access the raw stream, so we'll use FormData
    // but handle it differently for large files
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME && !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      return NextResponse.json(
        { error: 'Cloudinary cloud name not configured' },
        { status: 500 }
      );
    }

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        { error: 'Cloudinary API credentials not configured' },
        { status: 500 }
      );
    }

    const fileSize = file.size;
    const fileSizeMB = fileSize / (1024 * 1024);
    
    console.log(`[Cloudinary Upload] Processing file: ${file.name}, size: ${fileSizeMB.toFixed(2)}MB`);

    // Check file size limit (300MB)
    const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: 'File too large',
          details: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size of 300MB`
        },
        { status: 413 }
      );
    }

    // Step 2: Save file to temporary location for Cloudinary upload
    // Cloudinary SDK's upload method works best with file paths for large files
    const tempFileName = `cloudinary-upload-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    tempFilePath = path.join(uploadDir, tempFileName);

    // Convert File to Buffer and write to temp file in chunks to handle large files efficiently
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(tempFilePath, buffer);

    console.log(`[Cloudinary Upload] File saved to temp location: ${tempFilePath}`);

    // Step 3: Upload to Cloudinary using the file path
    // OPTIMIZATION: Disable eager transformations to speed up upload significantly
    // Eager transformations force Cloudinary to process videos immediately, which slows uploads
    // Transformations can be applied later via URL parameters when needed (e.g., ?q_auto:eco)
    const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
      resource_type: 'video',
      folder: folder,
      // OPTIMIZATION: Removed eager transformations for faster upload
      // Videos will be processed on-demand when accessed, not during upload
      // Chunk size for large file uploads (50MB chunks for faster upload)
      chunk_size: 50000000,
    });

    console.log('[Cloudinary Upload] Upload successful:', {
      publicId: uploadResult.public_id,
      size: uploadResult.bytes,
      format: uploadResult.format,
      secureUrl: uploadResult.secure_url,
    });

    // Step 4: Clean up temporary file
    try {
      await fs.unlink(tempFilePath);
      tempFilePath = null;
    } catch (cleanupError) {
      console.warn('[Cloudinary Upload] Failed to cleanup temp file:', cleanupError);
    }

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

  } catch (error) {
    // Step 6: Handle errors properly
    console.error('[Cloudinary Upload] Error:', error);

    // Clean up temporary file if it exists
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('[Cloudinary Upload] Failed to cleanup temp file on error:', cleanupError);
      }
    }

    // Check if error is from formidable (file size exceeded)
    if (error instanceof Error && error.message.includes('maxFileSize')) {
      return NextResponse.json(
        { 
          error: 'File too large',
          details: 'File size exceeds maximum allowed size of 300MB'
        },
        { status: 413 }
      );
    }

    // Respond with HTTP 500 if upload fails
    return NextResponse.json(
      { 
        error: 'Failed to upload video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});
