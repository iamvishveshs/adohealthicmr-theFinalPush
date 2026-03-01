# Video Storage Fix - Summary

## Problem Identified

The `data/videos.json` file was **270.75 MB** because it contained base64-encoded video data in the `preview` field instead of Cloudinary thumbnail URLs.

## Root Cause

Old video entries had base64 data URLs stored in the `preview` field. The current code correctly uses Cloudinary URLs, but the existing data needed cleanup.

## Solutions Implemented

### 1. ✅ Added Validation to Prevent Base64 Storage

**File:** `src/lib/store.ts`

- Added `validateVideoData()` function that rejects:
  - Base64 data URLs (`data:video/...`)
  - Blob URLs (`blob:...`)
- Applied validation in:
  - `createVideo()` - when creating new videos
  - `updateVideo()` - when updating existing videos
  - `loadData()` - filters out base64 data when loading from file

### 2. ✅ Cleaned Up Existing Data

**Script:** `scripts/cleanup-videos-json.js`

- Removed 2 videos with base64 data
- Created backup: `data/videos.json.backup` (270.75 MB)
- Cleaned file: `data/videos.json` (now empty array, ready for new uploads)
- **File size reduction: 100%** (270.75 MB → 0 MB)

### 3. ✅ Cloudinary Configuration

**Required Environment Variables:**
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` - Upload preset name (e.g., `adohealthicmr_video_upload`)

**Storage Location:**
- Videos are stored in Cloudinary at: `adohealthicmr/videos/{moduleId}/{videoType}`
- Metadata is stored in: `data/videos.json` (Cloudinary URLs only, no base64 data)

## Next Steps

### Re-upload Removed Videos

The following videos were removed and need to be re-uploaded to Cloudinary:

1. **Module 3, English Video 1**
   - File: `WhatsApp Video 2024-01-28 at 23.58.52_4f3e7b91.mp4`
   - Reason: base64 preview

2. **Module 4, English Video 1**
   - File: `WhatsApp Video 2026-02-10 at 1.00.11 AM.mp4`
   - Reason: base64 preview

### How to Re-upload

1. Log in as admin
2. Navigate to the module
3. Select the video type (English)
4. Upload the video again
5. The video will be uploaded to Cloudinary and metadata saved with Cloudinary URLs

## Prevention

The validation code now prevents:
- ✅ Base64 data URLs from being saved
- ✅ Blob URLs from being saved
- ✅ Invalid data from being loaded from file

All new videos will automatically use Cloudinary URLs for both `preview` (thumbnail) and `fileUrl` (video playback).

## Backup

Original file backed up to: `data/videos.json.backup`

If you need to restore the original file:
```bash
cp data/videos.json.backup data/videos.json
```

**Note:** The backup contains base64 data and should only be used for reference, not restored directly.
