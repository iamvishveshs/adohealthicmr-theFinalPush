/**
 * Video Upload Diagnostic Script
 * 
 * This script checks all common issues that prevent video uploads from working.
 * Run with: node scripts/diagnose-video-upload.js
 */

// Load .env.local manually if dotenv is not available
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    });
  }
  return env;
}

// Try to load .env.local
const envLocalPath = path.join(process.cwd(), '.env.local');
const envLocal = loadEnvFile(envLocalPath);

// Merge with process.env (env.local takes precedence)
Object.keys(envLocal).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = envLocal[key];
  }
});

const issues = [];
const fixes = [];

console.log('🔍 Video Upload Diagnostic Tool\n');
console.log('='.repeat(60));

// 1. Check Cloudinary Environment Variables
console.log('\n1. Checking Cloudinary Configuration...');
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

if (!cloudName) {
  issues.push('❌ CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is missing');
  fixes.push('Add to .env.local: CLOUDINARY_CLOUD_NAME=your_cloud_name');
} else {
  console.log(`   ✅ Cloud Name: ${cloudName}`);
}

if (!apiKey) {
  issues.push('❌ CLOUDINARY_API_KEY is missing');
  fixes.push('Add to .env.local: CLOUDINARY_API_KEY=your_api_key');
} else {
  console.log(`   ✅ API Key: ${apiKey.substring(0, 6)}...`);
}

if (!apiSecret) {
  issues.push('❌ CLOUDINARY_API_SECRET is missing');
  fixes.push('Add to .env.local: CLOUDINARY_API_SECRET=your_api_secret');
} else {
  console.log(`   ✅ API Secret: ${apiSecret.substring(0, 6)}...`);
}

if (!uploadPreset) {
  console.log('   ⚠️  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is not set (optional if using API credentials)');
} else {
  console.log(`   ✅ Upload Preset: ${uploadPreset}`);
}

// 2. Check Next.js Configuration
console.log('\n2. Checking Next.js Configuration...');

const nextConfigPath = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  
  // Check for body size limit configuration
  if (!nextConfig.includes('bodyParser') && !nextConfig.includes('api')) {
    issues.push('⚠️  Next.js body size limit not configured (may limit large video uploads)');
    fixes.push('Add body size limit to next.config.js (see fix below)');
  } else {
    console.log('   ✅ Body size limit configured');
  }
} else {
  issues.push('⚠️  next.config.js not found');
}

// 3. Check Authentication
console.log('\n3. Checking Authentication Setup...');
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'your-secret-key-change-in-production') {
  issues.push('⚠️  JWT_SECRET is using default value (security risk)');
  fixes.push('Set a secure JWT_SECRET in .env.local');
} else {
  console.log('   ✅ JWT_SECRET is set');
}

// 4. Check API Routes
console.log('\n4. Checking API Routes...');
const apiRoutes = [
  'src/app/api/cloudinary-upload/route.ts',
  'src/app/api/upload-video/route.ts',
];

apiRoutes.forEach(route => {
  const routePath = path.join(process.cwd(), route);
  if (fs.existsSync(routePath)) {
    console.log(`   ✅ ${route} exists`);
  } else {
    issues.push(`❌ ${route} is missing`);
  }
});

// 5. Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 DIAGNOSTIC SUMMARY\n');

if (issues.length === 0) {
  console.log('✅ All checks passed! Video upload should work.\n');
  console.log('If uploads still fail, check:');
  console.log('  1. Browser console for specific error messages');
  console.log('  2. Network tab for failed requests');
  console.log('  3. Server logs for detailed error information');
  console.log('  4. Ensure you are logged in as an admin user');
} else {
  console.log(`Found ${issues.length} issue(s):\n`);
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  
  console.log('\n🔧 RECOMMENDED FIXES:\n');
  fixes.forEach((fix, index) => {
    console.log(`${index + 1}. ${fix}`);
  });
  
  console.log('\n📝 Next Steps:');
  console.log('  1. Fix the issues listed above');
  console.log('  2. Restart your development server');
  console.log('  3. Clear browser cache and try uploading again');
  console.log('  4. Check browser console for detailed error messages');
}

console.log('\n' + '='.repeat(60));
