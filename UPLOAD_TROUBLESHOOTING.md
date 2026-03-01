# Video Upload Troubleshooting Guide

## Error: "Failed to upload after 3 attempts: Failed to fetch"

This error indicates a network or configuration issue with Cloudinary uploads.

## ✅ Quick Checks

### 1. Verify Cloudinary Configuration

Run the configuration checker:
```bash
node scripts/check-cloudinary-config.js
```

**Current Status:**
- ✅ Cloud name: `adohealth`
- ⚠️ Upload preset: `unsigned_preset` (verify this matches your Cloudinary preset name)

### 2. Check Upload Preset in Cloudinary

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Navigate to **Settings** → **Upload** → **Upload presets**
3. Verify your preset exists and is configured:
   - **Name**: Should match `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (currently: `unsigned_preset`)
   - **Signing mode**: Must be **Unsigned** ⚠️
   - **Resource type**: Should be **Video**
   - **Folder**: Optional, can be `adohealthicmr/videos`
   - **Max file size**: Should allow your video size (default is usually 10MB, increase if needed)

### 3. Common Issues & Solutions

#### Issue: "Failed to fetch" Network Error

**Possible Causes:**
1. **No Internet Connection**
   - Check your internet connection
   - Try accessing https://cloudinary.com in your browser

2. **CORS Policy Blocking**
   - Cloudinary should allow CORS by default
   - Check browser console for CORS errors
   - If using a proxy/VPN, try disabling it

3. **Firewall/Proxy Blocking**
   - Corporate firewalls may block Cloudinary
   - Check if `api.cloudinary.com` is accessible
   - Try from a different network

4. **Invalid Upload Preset**
   - Preset name must match exactly (case-sensitive)
   - Preset must be set to "Unsigned" mode
   - Preset must allow video uploads

5. **Cloudinary Service Down**
   - Check [Cloudinary Status](https://status.cloudinary.com/)
   - Try uploading a small test file

#### Issue: Upload Preset Name Mismatch

**Current preset name:** `unsigned_preset`

**Recommended preset name:** `adohealthicmr_video_upload`

If your preset has a different name, update `.env.local`:
```env
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_actual_preset_name
```

Then restart your dev server.

### 4. Test Upload Preset

You can test your upload preset directly:

1. Go to Cloudinary Console → Upload presets
2. Click on your preset
3. Try uploading a test video using the Cloudinary upload widget
4. If it works there, the preset is correct

### 5. Browser Console Debugging

Open browser DevTools (F12) and check:

1. **Console tab** - Look for detailed error messages
2. **Network tab** - Check the failed request:
   - URL: Should be `https://api.cloudinary.com/v1_1/adohealth/video/upload`
   - Status: Check the HTTP status code
   - Response: Check the error message from Cloudinary

### 6. Manual Retry

Videos stored locally will automatically retry. To manually retry:

1. The video is stored in browser IndexedDB
2. It will retry automatically when you:
   - Refresh the page
   - Navigate back to the module
   - The app detects pending uploads

### 7. Verify Upload Preset Configuration

Your upload preset should have these settings:

```
Preset Name: unsigned_preset (or your preset name)
Signing Mode: Unsigned ⚠️ (REQUIRED!)
Resource Type: Video
Folder: adohealthicmr/videos (optional)
Max File Size: 5242880 (5GB in KB) or higher
Eager Transformations: q_auto:eco,f_auto (optional)
```

## 🔧 Fix Steps

### Step 1: Verify Preset Name
```bash
# Check your .env.local file
cat .env.local | grep CLOUDINARY
```

### Step 2: Update Preset Name (if needed)
```env
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=adohealthicmr_video_upload
```

### Step 3: Restart Dev Server
```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

### Step 4: Clear Browser Cache
- Clear browser cache and localStorage
- Or use incognito/private mode

### Step 5: Try Upload Again
- Upload a small test video first (< 10MB)
- Check browser console for detailed errors

## 📊 Error Details

The improved error handling now provides:
- ✅ Detailed error messages
- ✅ Configuration validation
- ✅ Network error diagnostics
- ✅ HTTP status code explanations

Check the browser console for the full error message with troubleshooting hints.

## 🆘 Still Not Working?

1. **Check Cloudinary Dashboard:**
   - Verify your account is active
   - Check usage limits
   - Verify billing status

2. **Test with cURL:**
   ```bash
   curl -X POST https://api.cloudinary.com/v1_1/adohealth/video/upload \
     -F "file=@test-video.mp4" \
     -F "upload_preset=unsigned_preset"
   ```

3. **Contact Support:**
   - Include browser console errors
   - Include network tab details
   - Include Cloudinary preset configuration

## 📝 Notes

- Videos are stored locally in IndexedDB and will retry automatically
- Large files (>50MB) upload directly to Cloudinary
- Smaller files use a proxy route to avoid CORS issues
- All uploads use the unsigned preset (no API key needed)
