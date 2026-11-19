import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
const releaseDir = resolve(root, 'release');

async function run() {
  console.log('📦 Starting Chrome Web Store release packaging...');

  // 1. Build project
  console.log('⚙️ Step 1: Building extension from source...');
  execSync('node scripts/build.mjs', { cwd: root, stdio: 'inherit' });

  // 2. Validate dist manifest & core assets
  console.log('🔍 Step 2: Validating production assets in /dist...');
  const requiredFiles = [
    'manifest.json',
    'popup.html',
    'background.js',
    'content.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
  ];

  for (const file of requiredFiles) {
    const fullPath = resolve(distDir, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing required production file: ${file}`);
    }
  }

  // Parse manifest to extract version
  const manifest = JSON.parse(fs.readFileSync(resolve(distDir, 'manifest.json'), 'utf8'));
  const version = manifest.version || '2.3.0';
  console.log(`✅ Manifest verified: "${manifest.name}" v${version}`);

  // 3. Ensure release folder exists
  fs.mkdirSync(releaseDir, { recursive: true });

  const zipFileName = `linkedin-outreach-copilot-v${version}.zip`;
  const zipFilePath = resolve(releaseDir, zipFileName);
  const latestZipPath = resolve(releaseDir, 'latest.zip');

  // Remove existing zip if present
  if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
  if (fs.existsSync(latestZipPath)) fs.unlinkSync(latestZipPath);

  // 4. Archive dist contents directly to zip root (Critical for Chrome Web Store!)
  console.log('🗜️ Step 3: Compressing into Chrome Web Store upload archive...');
  execSync(`cd "${distDir}" && zip -r -9 "${zipFilePath}" .`, { stdio: 'pipe' });
  fs.copyFileSync(zipFilePath, latestZipPath);

  // 5. Compute file statistics
  const stats = fs.statSync(zipFilePath);
  const zipBuffer = fs.readFileSync(zipFilePath);
  const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');

  console.log('\n======================================================');
  console.log('🎉 CHROME WEB STORE RELEASE PACKAGE READY!');
  console.log('======================================================');
  console.log(`📁 File:      ${zipFileName}`);
  console.log(`📍 Path:      ${zipFilePath}`);
  console.log(`📦 Size:      ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`🔐 SHA-256:   ${sha256}`);
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
