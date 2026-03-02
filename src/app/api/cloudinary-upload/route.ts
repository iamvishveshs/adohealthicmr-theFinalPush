import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary using server-side environment variables only
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
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
  if (!cloudName) console.error('  - CLOUDINARY_CLOUD_NAME');
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
 * Cloudinary video upload endpoint
 * 
 * Handles FormData uploads directly to Cloudinary.
 * Supports both file uploads (FormData) and signature generation (JSON).
 * 
 * Environment variables required:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */
export async function POST(req: Request) {
  console.log('[Cloudinary Upload] ===== Starting upload request =====');

  try {
    // Step 1: Validate Cloudinary configuration
    const configCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const configApiKey = process.env.CLOUDINARY_API_KEY;
    const configApiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!configCloudName || !configApiKey || !configApiSecret) {
      console.error('[Cloudinary Upload] ❌ Missing credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Cloudinary configuration missing',
          details: 'Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    // Step 3: Validate file existence
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Validate file is a File instance
    if (!(file instanceof File)) {
      console.error('[Cloudinary Upload] ❌ Invalid file type');
      return new Response(
        JSON.stringify({ error: 'Invalid file provided. Expected File object.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const folder = (formData.get('folder') as string) || 'adohealthicmr/videos';

    console.log('[Cloudinary Upload] ✓ File received:', {
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      type: file.type,
      folder,
    });

    // Step 5: Upload file to Cloudinary using upload_stream
    const fileStream = Readable.fromWeb(file.stream() as any);
    
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: folder,
          chunk_size: 6000000, // 6MB chunks
          timeout: 600000, // 10 minutes timeout
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary Upload] ❌ Upload error:', {
              error: error.message || String(error),
              http_code: error.http_code,
            });
            reject(error);
          } else {
            console.log('[Cloudinary Upload] ✓ Upload completed:', {
              publicId: result?.public_id,
              fileSize: result?.bytes ? `${(result.bytes / (1024 * 1024)).toFixed(2)}MB` : 'unknown',
              secureUrl: result?.secure_url ? result.secure_url.substring(0, 50) + '...' : 'not available',
            });
            resolve(result);
          }
        }
      );

      fileStream.pipe(uploadStream);
      
      fileStream.on('error', (error: any) => {
        console.error('[Cloudinary Upload] ❌ File stream error:', error);
        reject(error);
      });
    }) as any;

    // Step 6: Return response with secure_url
    return new Response(
      JSON.stringify({
        success: true,
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url || uploadResult.url, // Always prefer secure_url
        url: uploadResult.url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration,
        resource_type: uploadResult.resource_type,
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[Cloudinary Upload] ❌ ERROR:', {
      error: error instanceof Error ? error.message : String(error),
      errorName: error?.name,
    });

    return new Response(
      JSON.stringify({ 
        error: 'Failed to process upload',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
