# Cloudinary CORS Setup Guide

## 🔧 Fixing CORS Errors for Direct Uploads

If you're seeing CORS errors when uploading videos directly to Cloudinary, follow these steps:

### Step 1: Access Cloudinary Dashboard
1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Log in to your account
3. Navigate to **Settings** → **Security**

### Step 2: Configure CORS Settings
1. Scroll down to the **CORS** section
2. Click **Add CORS URL**
3. Add your development domain:
   ```
   http://localhost:3000
   ```
4. For production, add your production domain:
   ```
   https://yourdomain.com
   ```
5. Click **Save**

### Step 3: Wait for Propagation
- CORS changes can take 1-2 minutes to propagate
- Clear your browser cache if errors persist
- Restart your development server

### Step 4: Verify Configuration
After saving, your CORS settings should look like:
```
Allowed CORS URLs:
✓ http://localhost:3000
✓ https://yourdomain.com
```

## 🚨 Common CORS Error Messages

- `CORS policy blocked uploads from http://localhost:3000`
- `Access-Control-Allow-Origin header is missing`
- `XMLHttpRequest error: Network Error`

All of these indicate that CORS is not properly configured in Cloudinary.

## ✅ Verification

Once configured, you should see successful uploads without CORS errors in the browser console.

## 📝 Notes

- CORS must be configured for **each domain** you upload from
- Development and production domains need separate entries
- Changes take effect within 1-2 minutes
- You can add multiple domains if needed
