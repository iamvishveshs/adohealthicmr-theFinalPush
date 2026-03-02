# VideoUploader Component Setup

## Overview

The `VideoUploader` component provides a complete solution for uploading large video files (250MB+) directly to Cloudinary from the browser.

## Files Created

1. **`src/app/components/VideoUploader.jsx`** - Main upload component
2. **`src/app/video-upload-test/page.jsx`** - Test page to try the component

## Environment Variables

Ensure your `.env.local` file contains:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=adohealth
```

**Note:** The component uses the unsigned preset `ml_default` and uploads to the `videos/` folder, so no API key/secret is needed for direct uploads.

## Features

✅ **Direct Cloudinary Upload** - Uploads directly from browser to Cloudinary (bypasses Next.js server)  
✅ **Large File Support** - Handles files up to 5GB (250MB+ tested)  
✅ **Local Preview** - Shows video preview before upload using `URL.createObjectURL`  
✅ **Progress Tracking** - Real-time upload progress bar with percentage  
✅ **Error Handling** - Comprehensive error messages  
✅ **Video Player** - Displays uploaded video after successful upload  
✅ **Metadata Display** - Shows file size, duration, resolution, and public ID  

## Usage

### Basic Usage

```jsx
import VideoUploader from '@/app/components/VideoUploader';

export default function MyPage() {
  return (
    <div>
      <VideoUploader />
    </div>
  );
}
```

### Test Page

Visit `/video-upload-test` to see the component in action.

## Component Props

Currently, the component accepts no props. All configuration is done via:
- Environment variables (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`)
- Hardcoded preset (`ml_default`)
- Hardcoded folder (`videos/`)

## Upload Flow

1. **File Selection**: User selects a video file
2. **Local Preview**: Video is previewed using `URL.createObjectURL`
3. **Upload**: On click, file uploads directly to Cloudinary using XMLHttpRequest
4. **Progress**: Real-time progress updates (0-100%)
5. **Result**: On success, shows Cloudinary URL and playable video
6. **Reset**: Option to upload another video

## Technical Details

### Direct Upload
- Uses `XMLHttpRequest` instead of `fetch` for upload progress tracking
- Uploads to: `https://api.cloudinary.com/v1_1/{cloudName}/video/upload`
- Uses unsigned preset `ml_default` (no authentication needed)
- Uploads to folder: `videos/`

### Progress Tracking
- Uses `xhr.upload.addEventListener('progress')` for real-time updates
- Displays progress bar with percentage
- Updates every time data is uploaded

### File Handling
- Maximum file size: 5GB (configurable)
- Accepts all video types (`video/*`)
- Creates object URL for preview (cleaned up on unmount)

## Cloudinary Preset Configuration

Ensure your Cloudinary preset `ml_default` is configured:

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Navigate to **Settings** → **Upload** → **Upload presets**
3. Find or create preset named `ml_default`
4. Configure:
   - **Signing mode**: Unsigned
   - **Resource type**: Video
   - **Folder**: videos/ (optional, component sets this)
   - **Max file size**: Set appropriate limit (or leave unlimited)

## Troubleshooting

### "Cloudinary cloud name is not configured"
- Check `.env.local` has `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- Restart dev server after adding environment variables

### Upload fails with 401/403
- Verify preset `ml_default` exists and is set to "Unsigned"
- Check preset allows video uploads

### Progress not updating
- This is normal for very fast uploads
- Progress updates depend on network speed

### CORS errors
- Cloudinary should allow CORS by default
- If issues persist, check Cloudinary security settings

## Example Response

After successful upload, the component receives:

```json
{
  "public_id": "videos/abc123",
  "secure_url": "https://res.cloudinary.com/adohealth/video/upload/v1234567/videos/abc123.mp4",
  "url": "http://res.cloudinary.com/adohealth/video/upload/v1234567/videos/abc123.mp4",
  "format": "mp4",
  "bytes": 262144000,
  "width": 1920,
  "height": 1080,
  "duration": 120.5,
  "resource_type": "video"
}
```

## Next Steps

1. ✅ Component created
2. ✅ Test page created at `/video-upload-test`
3. ⏭️  Ensure `.env.local` has `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=adohealth`
4. ⏭️  Restart dev server: `npm run dev`
5. ⏭️  Visit `/video-upload-test` to test the component
