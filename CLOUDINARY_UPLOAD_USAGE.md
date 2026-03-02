# Cloudinary Upload API Route Usage

## Route Location
`src/app/api/cloudinary-upload/route.js`

## Environment Variables

Add these to your `.env.local` file:

```env
CLOUDINARY_CLOUD_NAME=adohealth
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=adohealth
CLOUDINARY_API_KEY=679322831275176
CLOUDINARY_API_SECRET=u5hub93DijW-3qEKGmIphZcKMSc
```

## API Endpoint

**URL:** `/api/cloudinary-upload`  
**Method:** `POST`  
**Content-Type:** `multipart/form-data`

## Request Format

Send a `FormData` object with:
- `file` (required): The video file to upload
- `folder` (optional): Cloudinary folder path (default: `'uploads'`)

## Response Format

### Success (200 OK)
```json
{
  "success": true,
  "public_id": "adohealthicmr/videos/1/english/abc123",
  "secure_url": "https://res.cloudinary.com/adohealth/video/upload/v1234567/...",
  "url": "http://res.cloudinary.com/adohealth/video/upload/v1234567/...",
  "format": "mp4",
  "bytes": 52428800,
  "width": 1920,
  "height": 1080,
  "duration": 120.5,
  "resource_type": "video"
}
```

### Error Responses

**400 Bad Request** - Missing file or invalid request
```json
{
  "error": "No file provided"
}
```

**401 Unauthorized** - Invalid Cloudinary credentials
```json
{
  "error": "Cloudinary authentication failed",
  "details": "Invalid API credentials. Please verify CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local"
}
```

**413 Payload Too Large** - File exceeds 300MB limit
```json
{
  "error": "File too large",
  "details": "File size (350.00MB) exceeds maximum allowed size of 300MB"
}
```

**500 Internal Server Error** - Server error
```json
{
  "error": "Failed to upload video",
  "details": "Error message here"
}
```

## Usage Examples

### JavaScript/TypeScript (Client-side)

```javascript
async function uploadVideo(file, folder = 'uploads') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  try {
    const response = await fetch('/api/cloudinary-upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    console.log('Upload successful:', result);
    return result;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Usage
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    try {
      const result = await uploadVideo(file, 'adohealthicmr/videos/1/english');
      console.log('Video URL:', result.secure_url);
    } catch (error) {
      console.error('Failed to upload:', error);
    }
  }
});
```

### React Example

```jsx
import { useState } from 'react';

function VideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'adohealthicmr/videos');

    try {
      const response = await fetch('/api/cloudinary-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
      console.log('Upload successful:', data);
    } catch (err) {
      setError(err.message);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="video/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {result && (
        <div>
          <p>Upload successful!</p>
          <p>Video URL: {result.secure_url}</p>
        </div>
      )}
    </div>
  );
}
```

### cURL Example

```bash
curl -X POST http://localhost:3000/api/cloudinary-upload \
  -F "file=@/path/to/video.mp4" \
  -F "folder=adohealthicmr/videos"
```

## Features

- ✅ Streams large files efficiently (up to 300MB)
- ✅ Uses Cloudinary v2 SDK with `upload_stream`
- ✅ Proper error handling with detailed messages
- ✅ Supports custom folder organization
- ✅ Returns full Cloudinary response including metadata
- ✅ 5-minute timeout for large uploads
- ✅ 50MB chunk size for faster uploads

## File Size Limits

- **Maximum file size:** 300MB
- **Recommended:** Keep videos under 100MB for faster uploads
- **Timeout:** 5 minutes (300 seconds)

## Notes

- The route uses `resource_type: 'video'` for all uploads
- Files are streamed directly to Cloudinary without loading into memory
- The route is configured for Next.js App Router
- Environment variables are validated at startup and request time
