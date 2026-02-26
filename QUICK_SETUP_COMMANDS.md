# Quick Setup Commands

## 📦 Terminal Commands

### 1. No Additional Packages Needed
```bash
# All functionality uses browser APIs - no npm install required
# Just ensure your existing dependencies are installed:
npm install
```

## 🔧 Environment Variables Setup

### Create/Update `.env.local` in project root:

```bash
# Windows PowerShell
notepad .env.local

# Or use your preferred editor
```

### Add these variables:

```env
# Cloudinary Direct Upload Configuration (REQUIRED)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=adohealthicmr_video_upload

# Optional: For backend operations
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
```

## ☁️ Cloudinary Setup Steps

### 1. Create Unsigned Upload Preset

1. Go to: https://cloudinary.com/console
2. Navigate to: **Settings** → **Upload** → **Upload presets**
3. Click: **Add upload preset**
4. Configure:
   - **Preset name**: `adohealthicmr_video_upload`
   - **Signing mode**: **Unsigned** ⚠️ (Required!)
   - **Folder**: `adohealthicmr/videos` (optional)
   - **Resource type**: **Video**
   - **Max file size**: `5242880` (5GB in KB)
   - **Eager transformations**: `q_auto:eco,f_auto`
5. Click: **Save**

### 2. Get Your Cloud Name

- Found in Cloudinary dashboard (top right)
- Example: `dxyz123abc`

### 3. Copy Preset Name

- The name you set in step 1
- Example: `adohealthicmr_video_upload`

## ✅ Verify Setup

### Check Environment Variables:

```bash
# Windows PowerShell - Check if file exists
Test-Path .env.local

# View contents (remove secrets before sharing!)
Get-Content .env.local
```

### Test Upload:

1. Start dev server: `npm run dev`
2. Open browser: http://localhost:3000
3. Log in as admin
4. Try uploading a test video
5. Check:
   - Progress bar appears
   - Upload completes
   - Video appears in Cloudinary dashboard

## 🐛 Troubleshooting

### "Cloudinary configuration missing"
- Check `.env.local` exists in project root
- Verify variable names are correct (case-sensitive)
- Restart dev server after adding variables

### "Upload preset not found"
- Verify preset name matches exactly
- Ensure preset is set to **Unsigned**
- Check preset is active in Cloudinary dashboard

### Upload fails
- Check browser console for errors
- Verify Cloudinary credentials are correct
- Check network connection
- Try smaller file first

## 📝 Quick Reference

**Required Variables:**
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

**Optional Variables:**
- `CLOUDINARY_API_KEY` (for backend operations)
- `CLOUDINARY_API_SECRET` (for backend operations)
- `JWT_SECRET` (for authentication)

**File Location:**
- `.env.local` in project root (`C:\projects\adohealthicmr\.env.local`)
