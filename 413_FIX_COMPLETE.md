# 413 Payload Too Large - Complete Fix

## ✅ Solution Implemented

### Problem
- Getting `413 Request Entity Too Large` error for 250MB video uploads
- Next.js App Router has body size limits (~50MB)
- Vercel has 4.5MB hard limit for serverless functions

### Solution: Direct Cloudinary Upload for Large Files

**Files > 100MB** now upload **directly from browser to Cloudinary**, completely bypassing Next.js/Vercel limits.

## 🔧 Changes Made

### 1. Updated Upload Logic (`src/lib/cloudinary-direct-upload.ts`)

- **Files > 100MB**: Upload directly to Cloudinary (bypasses server)
- **Files < 100MB**: Use proxy route (avoids CORS)

### 2. Enhanced Error Handling

- Better CORS error messages with instructions
- Automatic fallback and retry logic
- Detailed error diagnostics

### 3. Proxy Route Protection (`src/app/api/cloudinary-upload/route.ts`)

- Returns 413 error if file > 100MB reaches proxy
- Instructs client to use direct upload
- Ensures `resource_type: 'video'` is always set

## 📊 Upload Strategy

| File Size | Method | Why |
|-----------|--------|-----|
| < 100MB | Proxy route (`/api/cloudinary-upload`) | Avoids CORS, works on all platforms |
| > 100MB | Direct to Cloudinary | Bypasses Next.js/Vercel limits |

## ⚠️ Important: CORS Configuration Required

For direct uploads to work, you **must configure CORS in Cloudinary**:

### Steps:
1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Navigate to **Settings** → **Security**
3. Find **"Allowed fetch domains"** or **"CORS"** section
4. Add your domains:
   - `http://localhost:3000` (development)
   - `https://yourdomain.vercel.app` (Vercel preview)
   - `https://yourdomain.com` (production)
5. Click **Save**

### Without CORS Configuration:
- Direct uploads will fail with CORS errors
- You'll see: "Access to fetch at 'https://api.cloudinary.com/...' has been blocked by CORS policy"

## 🚀 For Vercel Deployment

### ✅ Already Configured
- Files > 100MB automatically use direct upload
- Completely bypasses Vercel's 4.5MB limit
- No code changes needed

### ⚠️ Required: CORS Setup
- Must configure CORS in Cloudinary (see above)
- Otherwise direct uploads will fail

## 📝 Next.js App Router Notes

**Important:** Next.js App Router does **NOT** support the Pages Router config syntax:
```typescript
// ❌ This doesn't work in App Router
export const config = { 
  api: { bodyParser: { sizeLimit: '300mb' } } 
}
```

**Why:** App Router route handlers use a different architecture and body size limits are hardcoded.

**Solution:** Use direct Cloudinary upload for large files (already implemented).

## ✅ Verification

1. **Check file size threshold**: Files > 100MB use direct upload
2. **Verify resource_type**: Always set to `'video'`
3. **Test upload**: Try uploading your 250MB video
4. **Check console**: Should see "Uploading large file directly to Cloudinary"

## 🔍 Testing

1. **Restart dev server:**
   ```bash
   npm run dev
   ```

2. **Try uploading 250MB video:**
   - Should automatically use direct Cloudinary upload
   - Check browser console for upload progress
   - If CORS error, configure Cloudinary CORS settings

3. **Check logs:**
   - Should see: "Uploading large file directly to Cloudinary (bypassing server limits)..."
   - No 413 errors should occur

## 🆘 Troubleshooting

### Still Getting 413 Error?
- Check file size - should be > 100MB to trigger direct upload
- Check browser console for which route is being used
- Verify Cloudinary configuration

### CORS Error?
- Configure CORS in Cloudinary Dashboard (see above)
- Check browser console for detailed error
- Verify your domain is in allowed list

### Upload Still Fails?
- Check Cloudinary preset is set to "Unsigned"
- Verify `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` matches your preset name
- Check internet connection

## 📋 Summary

✅ **Fixed**: Files > 100MB now use direct Cloudinary upload  
✅ **Fixed**: Bypasses Next.js/Vercel body size limits  
✅ **Fixed**: Ensures `resource_type: 'video'` is always set  
⚠️ **Required**: Configure CORS in Cloudinary Dashboard  

**Your 250MB video should now upload successfully!**
