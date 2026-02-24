#!/usr/bin/env node
/**
 * Simple helper to create a .env.local file from CLI args or environment variables.
 *
 * Usage:
 *  node scripts/create-env-local.js CLOUDINARY_CLOUD_NAME=adohealth CLOUDINARY_API_KEY=679322831275176 CLOUDINARY_API_SECRET=yoursecret JWT_SECRET=yourjwt NEXT_PUBLIC_APP_URL=http://localhost:3000
 *
 * Or set the values in the environment and run without args.
 */
const fs = require('fs');
const path = require('path');

const expectedKeys = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'JWT_SECRET',
  'NEXT_PUBLIC_APP_URL'
];

function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const idx = arg.indexOf('=');
    if (idx === -1) continue;
    const key = arg.slice(0, idx).trim();
    const val = arg.slice(idx + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

const args = parseArgs();
const env = {};

for (const key of expectedKeys) {
  env[key] = args[key] || process.env[key] || '';
}

// If some values are missing, warn but still write file (user can edit)
const missing = Object.entries(env).filter(([k, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.warn('Warning: missing values for:', missing.join(', '));
  console.warn('You can provide them as CLI args like KEY=value or set them in the environment.');
}

const outPath = path.join(process.cwd(), '.env.local');
const contents = Object.entries(env)
  .map(([k, v]) => `${k}=${v}`)
  .join('\n') + '\n';

try {
  fs.writeFileSync(outPath, contents, { encoding: 'utf8', flag: 'w' });
  console.log(`✅ Wrote ${outPath}`);
  console.log('🔒 Note: .env.local is in .gitignore and will not be committed.');
} catch (err) {
  console.error('❌ Failed to write .env.local:', err);
  process.exit(1);
}

