import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function run() {
  console.log('🚀 Building LinkedIn Outreach Copilot Chrome Extension...');

  // 1. Build Popup UI
  console.log('📦 1/3: Building Popup UI...');
  await build({
    root,
    configFile: false,
    plugins: [react()],
    build: {
      outDir: resolve(root, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(root, 'popup.html'),
        },
      },
    },
  });

  // 2. Build Content Script as self-contained IIFE
  console.log('📦 2/3: Building Content Script (Ultra-fast Vanilla TS IIFE)...');
  await build({
    root,
    configFile: false,
    build: {
      outDir: resolve(root, 'dist'),
      emptyOutDir: false,
      lib: {
        entry: resolve(root, 'src/content/index.ts'),
        name: 'LinkedInCopilotContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    },
  });

  // 3. Build Background Service Worker
  console.log('📦 3/3: Building Background Service Worker...');
  await build({
    root,
    configFile: false,
    build: {
      outDir: resolve(root, 'dist'),
      emptyOutDir: false,
      lib: {
        entry: resolve(root, 'src/background/index.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
    },
  });

  // 4. Copy manifest.json to dist
  const manifestSrc = resolve(root, 'public/manifest.json');
  const manifestDest = resolve(root, 'dist/manifest.json');
  fs.copyFileSync(manifestSrc, manifestDest);

  console.log('✅ Chrome Extension build finished successfully! Ready in /dist');
}

run().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
