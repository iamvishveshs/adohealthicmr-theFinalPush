/**
 * Test Cloudinary Upload Configuration
 * 
 * This script tests if Cloudinary is properly configured and can upload a small test file.
 * Run with: node scripts/test-cloudinary-upload.js
 */

require('dotenv').config({ path: '.env.local' });
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('=== Cloudinary Configuration Test ===\n');
console.log('Environment Variables:');
console.log(`  CLOUDINARY_CLOUD_NAME: ${cloudName || 'NOT SET'}`);
console.log(`  CLOUDINARY_API_KEY: ${apiKey ? 'SET (' + apiKey.substring(0, 6) + '...)' : 'NOT SET'}`);
console.log(`  CLOUDINARY_API_SECRET: ${apiSecret ? 'SET (' + apiSecret.substring(0, 6) + '...)' : 'NOT SET'}\n`);

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ ERROR: Missing required environment variables!');
  console.error('Please set the following in .env.local:');
  if (!cloudName) console.error('  - CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  if (!apiKey) console.error('  - CLOUDINARY_API_KEY');
  if (!apiSecret) console.error('  - CLOUDINARY_API_SECRET');
  process.exit(1);
}

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

console.log('Cloudinary SDK Configuration:');
console.log(`  Cloud Name: ${cloudinary.config().cloud_name}`);
console.log(`  API Key: ${cloudinary.config().api_key ? 'SET' : 'NOT SET'}`);
console.log(`  API Secret: ${cloudinary.config().api_secret ? 'SET' : 'NOT SET'}`);
console.log(`  Secure: ${cloudinary.config().secure}\n`);

// Test upload endpoint
const testEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
console.log(`Upload Endpoint: ${testEndpoint}\n`);

// Test with a small text file (simulating video upload)
async function testUpload() {
  try {
    console.log('Testing Cloudinary connection...\n');
    
    // Create a small test file
    const testFile = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFile, 'Test upload file for Cloudinary configuration verification.');
    
    console.log('Attempting test upload...');
    
    // Try uploading as video (this will fail but will show if credentials work)
    const result = await cloudinary.uploader.upload(testFile, {
      resource_type: 'video',
      folder: 'test-uploads',
      timeout: 10000, // 10 second timeout for test
    });
    
    console.log('✅ SUCCESS: Cloudinary upload test passed!');
    console.log(`  Public ID: ${result.public_id}`);
    console.log(`  URL: ${result.secure_url}\n`);
    
    // Clean up test file
    fs.unlinkSync(testFile);
    
    console.log('✅ Cloudinary is properly configured and working!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR: Cloudinary upload test failed!\n');
    console.error('Error Details:');
    console.error(`  Message: ${error.message}`);
    console.error(`  HTTP Code: ${error.http_code || 'N/A'}`);
    console.error(`  Name: ${error.name || 'N/A'}`);
    
    if (error.http_code === 401) {
      console.error('\n⚠️  Authentication Error:');
      console.error('  Your API credentials are invalid or incorrect.');
      console.error('  Please verify CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local');
    } else if (error.http_code === 400) {
      console.error('\n⚠️  Request Error:');
      console.error('  The request to Cloudinary was invalid.');
      console.error('  This might be a configuration issue.');
    } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
      console.error('\n⚠️  Network Error:');
      console.error('  Cannot connect to Cloudinary servers.');
      console.error('  Please check your internet connection.');
    } else {
      console.error('\n⚠️  Unknown Error:');
      console.error('  Please check the error details above.');
    }
    
    // Clean up test file if it exists
    const testFile = path.join(__dirname, 'test-upload.txt');
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    
    process.exit(1);
  }
}

testUpload();
