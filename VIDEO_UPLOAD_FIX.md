# Video Upload Fix Guide

## Common Issues and Solutions

### Issue 1: Missing Cloudinary Environment Variables

**Symptoms:**
- Error: "Cloudinary configuration missing"
- Error: "Failed to upload video"
- 500 error from `/api/cloudinary-upload`

**Solution:**
1. Create or update `.env.local` file in the project root:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

2. Get your Cloudinary credentials:
   - Go to [Cloudinary Console](https://cloudinary.com/console)
   - Navigate to **Settings** → **Security**
   - Copy your Cloud Name, API Key, and API Secret

3. Restart your development server after adding environment variables

### Issue 2: Authentication Errors (401/403)

**Symptoms:**
- Error: "Unauthorized"
- Error: "Forbidden - Admin access required"
- Upload button doesn't work

**Solution:**
1. **Check if you're logged in:**
   - Open browser DevTools (F12)
   - Go to Application/Storage → Local Storage
   - Check if `authToken` exists

2. **Check if you're an admin:**
   - The user role must be `admin` in the database
   - Check your user record in the database

3. **Re-login as admin:**
   - Log out and log back in
   - Ensure you're using an admin account

### Issue 3: File Size Limits (413 Error)

**Symptoms:**
- Error: "Request Entity Too Large"
- Error: "File too large"
- Upload fails for videos > 100MB

**Solution:**
1. **Next.js Configuration (Already Fixed):**
   - The `next.config.js` has been updated to support 300MB uploads
   - Restart your dev server after the fix

2. **For Vercel Deployment:**
   - Vercel has a 4.5MB limit for serverless functions
   - Use the proxy route (`/api/cloudinary-upload`) which streams files
   - The proxy route handles large files efficiently

### Issue 4: Network/CORS Errors

**Symptoms:**
- Error: "Failed to fetch"
- Error: "Network error"
- CORS errors in browser console

**Solution:**
1. **Check Internet Connection:**
   - Ensure you have a stable internet connection
   - Try accessing https://cloudinary.com

2. **Check Firewall/Proxy:**
   - Corporate firewalls may block Cloudinary
   - Try from a different network
   - Check if `api.cloudinary.com` is accessible

3. **Browser Issues:**
   - Clear browser cache
   - Try incognito/private mode
   - Try a different browser

### Issue 5: Cloudinary Upload Preset Issues

**Symptoms:**
- Error: "Invalid upload preset"
- Error: "Authentication failed"

**Solution:**
1. **If using unsigned upload preset:**
   - Set `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` in `.env.local`
   - Ensure preset is set to "Unsigned" mode in Cloudinary
   - Preset must allow video uploads

2. **If using API credentials (Recommended):**
   - No preset needed
   - Use `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`
   - The proxy route uses API credentials automatically

## Diagnostic Steps

### Step 1: Run Diagnostic Script
```bash
node scripts/diagnose-video-upload.js
```

This will check:
- Cloudinary environment variables
- Next.js configuration
- Authentication setup
- API routes

### Step 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for error messages starting with `[Video Upload]` or `[Cloudinary Upload]`
4. Check for specific error codes (401, 403, 413, 500)

### Step 3: Check Network Tab
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try uploading a video
4. Look for failed requests to `/api/cloudinary-upload`
5. Check the response status and error message

### Step 4: Check Server Logs
1. Look at your terminal where the dev server is running
2. Check for error messages starting with `[Cloudinary Upload]`
3. Look for authentication errors or configuration issues

## Quick Fix Checklist

- [ ] Cloudinary credentials are set in `.env.local`
- [ ] Restarted dev server after adding environment variables
- [ ] Logged in as admin user
- [ ] Browser console shows no errors
- [ ] Network tab shows successful requests
- [ ] File size is under 300MB (or using proxy route)
- [ ] Internet connection is stable

## Testing the Fix

1. **Test with a small video (< 10MB):**
   ```bash
   # Upload a small test video first
   ```

2. **Check upload progress:**
   - You should see "Video stored! Uploading to Cloudinary in background..."
   - Progress should update in the UI
   - Success message should appear when complete

3. **Verify video appears:**
   - Video should appear in the pending videos section
   - Click "Save Video" to make it available to all users

## Still Not Working?

1. **Run the diagnostic script:**
   ```bash
   node scripts/diagnose-video-upload.js
   ```

2. **Check specific error messages:**
   - Copy the exact error message from browser console
   - Check server logs for detailed errors

3. **Verify Cloudinary account:**
   - Check Cloudinary dashboard for account status
   - Verify billing/usage limits
   - Check if account is active

4. **Test Cloudinary directly:**
   ```bash
   node scripts/test-cloudinary-upload.js
   ```

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Troubleshooting Guide](./UPLOAD_TROUBLESHOOTING.md)
