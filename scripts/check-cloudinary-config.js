/**
 * Cloudinary Configuration Checker
 * 
 * This script checks if Cloudinary environment variables are properly configured.
 * 
 * Usage: node scripts/check-cloudinary-config.js
 */

const fs = require('fs');
const path = require('path');

function checkCloudinaryConfig() {
  console.log('🔍 Checking Cloudinary Configuration...\n');

  // Check for .env.local file
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envPath = path.join(process.cwd(), '.env');
  
  let envContent = '';
  let envFile = '';

  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
    envFile = '.env.local';
  } else if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    envFile = '.env';
  } else {
    console.log('❌ No .env.local or .env file found!\n');
    console.log('Please create a .env.local file with the following variables:');
    console.log('  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.log('  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset_name\n');
    return false;
  }

  console.log(`✅ Found ${envFile} file\n`);

  // Check for required variables
  const requiredVars = {
    'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME': false,
    'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET': false,
  };

  const optionalVars = {
    'CLOUDINARY_API_KEY': false,
    'CLOUDINARY_API_SECRET': false,
  };

  // Parse environment variables
  const lines = envContent.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      
      if (requiredVars.hasOwnProperty(key)) {
        requiredVars[key] = value && value !== '' ? value : false;
      }
      if (optionalVars.hasOwnProperty(key)) {
        optionalVars[key] = value && value !== '' ? value : false;
      }
    }
  });

  // Check required variables
  console.log('Required Variables:');
  let allRequired = true;
  
  for (const [key, value] of Object.entries(requiredVars)) {
    if (value) {
      // Mask sensitive values
      const displayValue = key.includes('PRESET') ? value : value.substring(0, 8) + '...';
      console.log(`  ✅ ${key} = ${displayValue}`);
    } else {
      console.log(`  ❌ ${key} = NOT SET`);
      allRequired = false;
    }
  }

  console.log('\nOptional Variables (for backend operations):');
  for (const [key, value] of Object.entries(optionalVars)) {
    if (value) {
      const displayValue = value.substring(0, 8) + '...';
      console.log(`  ✅ ${key} = ${displayValue}`);
    } else {
      console.log(`  ⚠️  ${key} = NOT SET (optional)`);
    }
  }

  // Validate Cloudinary URL construction
  if (requiredVars['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME']) {
    const cloudName = requiredVars['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'];
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
    console.log(`\n📡 Upload URL: ${uploadUrl}`);
    
    // Basic validation
    if (cloudName.length < 3) {
      console.log('  ⚠️  Cloud name seems too short. Please verify.');
    } else {
      console.log('  ✅ URL format looks correct');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allRequired) {
    console.log('✅ All required Cloudinary variables are set!');
    console.log('\nIf uploads are still failing, check:');
    console.log('  1. Internet connection');
    console.log('  2. Cloudinary dashboard: https://cloudinary.com/console');
    console.log('  3. Upload preset is set to "Unsigned" mode');
    console.log('  4. Upload preset allows video uploads');
    console.log('  5. Browser console for detailed error messages');
    return true;
  } else {
    console.log('❌ Some required variables are missing!');
    console.log('\nPlease set the missing variables in your .env.local file.');
    return false;
  }
}

// Run check
const isValid = checkCloudinaryConfig();
process.exit(isValid ? 0 : 1);
