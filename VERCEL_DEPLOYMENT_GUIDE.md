# Vercel Deployment - Large File Upload Guide

## ⚠️ Important: Vercel's 4.5MB Body Size Limit

Vercel has a **hard 4.5MB limit** for serverless function request bodies. This means:
- ❌ **Cannot upload files > 4.5MB through Next.js API routes on Vercel**
- ✅ **Solution: Use direct browser-to-Cloudinary upload**

## ✅ Recommended Solution: Direct Cloudinary Upload

For files > 100MB, the code now uploads **directly from browser to Cloudinary**, bypassing Vercel completely.

### How It Works:

```
Browser → Cloudinary (direct upload, bypasses Vercel/Next.js)
```

Instead of:
```
Browser → Vercel/Next.js → Cloudinary (hits 4.5MB limit)
```

## 🔧 Cloudinary CORS Configuration

For direct uploads to work, you need to configure CORS in Cloudinary:

### Steps:

1. **Go to Cloudinary Dashboard**: https://cloudinary.com/console
2. **Navigate to**: Settings → Security
3. **Find "Allowed fetch domains"** or **"CORS"** settings
4. **Add your domains**:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.vercel.app` (for Vercel preview)
   - `https://yourdomain.com` (for production)
5. **Save settings**

### Alternative: Use Cloudinary Upload Widget

If CORS configuration is not available, you can use Cloudinary's upload widget which handles CORS automatically.

## 📊 Current Upload Strategy

| File Size | Upload Method | Why |
|-----------|--------------|-----|
| < 100MB | Proxy route (`/api/cloudinary-upload`) | Avoids CORS, works on Vercel |
| > 100MB | Direct to Cloudinary | Bypasses Vercel 4.5MB limit |

## 🚀 For Vercel Deployment

### Option 1: Direct Upload (Recommended - Already Implemented)

✅ **Already configured in code**
- Files > 100MB upload directly to Cloudinary
- Bypasses Vercel's 4.5MB limit
- Requires CORS configuration in Cloudinary

### Option 2: Use Vercel Blob Storage (Alternative)

If direct Cloudinary upload doesn't work due to CORS:

1. **Use Vercel Blob Storage** for temporary storage
2. **Upload from Vercel Blob to Cloudinary** in background
3. More complex but works around limits

### Option 3: Compress Videos Before Upload

- Compress videos to < 100MB before uploading
- Use proxy route (works on Vercel)
- Simpler and faster

## 🔍 Testing on Vercel

1. **Deploy to Vercel**
2. **Try uploading a large video (> 100MB)**
3. **Check browser console** for CORS errors
4. **If CORS errors**, configure Cloudinary CORS settings
5. **If 413 errors**, the file is still going through proxy - check file size threshold

## 📝 Environment Variables for Vercel

Make sure these are set in Vercel:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset_name
```

## ✅ Current Status

- ✅ Code configured for direct upload for files > 100MB
- ⚠️ Requires Cloudinary CORS configuration
- ✅ Proxy route still works for files < 100MB
- ✅ Handles Vercel's 4.5MB limit automatically
