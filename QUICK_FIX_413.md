# Quick Fix: 413 Payload Too Large

## ✅ What Was Fixed

Your 250MB video upload was failing with `413 Request Entity Too Large` error.

## 🔧 Solution Applied

### 1. **Direct Cloudinary Upload for Large Files**
- Files **> 100MB** now upload **directly from browser to Cloudinary**
- Completely bypasses Next.js/Vercel body size limits
- No server involved = no 413 errors

### 2. **Resource Type Ensured**
- `resource_type: 'video'` is always set in all upload paths
- Verified in both direct and proxy uploads

### 3. **Proxy Route Protection**
- Proxy route now rejects files > 100MB with helpful error
- Client automatically retries with direct upload

## ⚠️ IMPORTANT: Configure CORS in Cloudinary

**This is required for direct uploads to work!**

1. Go to: https://cloudinary.com/console
2. Settings → Security
3. Find "Allowed fetch domains" or "CORS"
4. Add:
   - `http://localhost:3000`
   - Your production domain
5. Save

**Without this, you'll get CORS errors instead of 413 errors.**

## 🚀 How to Test

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Upload your 250MB video:**
   - Should automatically use direct Cloudinary upload
   - Check browser console: "Uploading large file directly to Cloudinary..."
   - No 413 errors!

3. **If you see CORS error:**
   - Configure CORS in Cloudinary (see above)
   - Upload will work after CORS is configured

## 📊 Current Behavior

| Your File | Upload Method | Status |
|-----------|--------------|--------|
| 250MB video | Direct to Cloudinary | ✅ Bypasses 413 |
| < 100MB | Proxy route | ✅ Works normally |

## ✅ Summary

- ✅ 413 error fixed for files > 100MB
- ✅ Direct Cloudinary upload implemented
- ✅ `resource_type: 'video'` ensured
- ⚠️ **Action Required**: Configure CORS in Cloudinary

**Your upload should work now!**
