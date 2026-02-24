#!/usr/bin/env node
/**
 * Vercel Deployment Helper Script
 * This script helps prepare your project for Vercel deployment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🚀 Vercel Deployment Helper\n');

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('✅ Generated JWT_SECRET:');
console.log(jwtSecret);
console.log('\n📋 Copy this value for your Vercel environment variables!\n');

// Create environment variables template
const envTemplate = `# Vercel Environment Variables
# Copy these to Vercel Dashboard → Settings → Environment Variables

JWT_SECRET=${jwtSecret}
NODE_ENV=production
WEB3FORMS_ACCESS_KEY=your-web3forms-key-here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
`;

const envFile = path.join(__dirname, 'vercel-env-template.txt');
fs.writeFileSync(envFile, envTemplate);
console.log(`✅ Created vercel-env-template.txt with your JWT_SECRET\n`);

console.log('📝 Next Steps:');
console.log('1. Go to: https://vercel.com/new');
console.log('2. Sign in with GitHub');
console.log('3. Import: arpitthakur0208/adohealthicmr');
console.log('4. Add environment variables (see vercel-env-template.txt)');
console.log('5. Click Deploy!\n');

console.log('🔗 Your Repository: https://github.com/arpitthakur0208/adohealthicmr\n');
