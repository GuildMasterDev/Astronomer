#!/usr/bin/env node

import { execSync } from 'child_process';
import { rmSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function clean() {
  console.log('🧹 Cleaning build directories...');
  rmSync(path.join(rootDir, 'dist'), { recursive: true, force: true });
  rmSync(path.join(rootDir, 'dist-electron'), { recursive: true, force: true });
}

function compile() {
  console.log('📦 Compiling TypeScript...');
  execSync('tsc', { stdio: 'inherit', cwd: rootDir });
}

function copyAssets() {
  console.log('📋 Copying assets...');
  mkdirSync(path.join(rootDir, 'dist/renderer'), { recursive: true });
  
  // Copy HTML, CSS, and JS files
  execSync(`cp -r src/renderer/*.html dist/renderer/`, { cwd: rootDir });
  execSync(`cp -r src/renderer/*.css dist/renderer/`, { cwd: rootDir });
  execSync(`cp -r src/renderer/*.js dist/renderer/`, { cwd: rootDir });
  execSync(`cp -r src/renderer/views dist/renderer/`, { cwd: rootDir });
  execSync(`cp -r src/renderer/utils dist/renderer/`, { cwd: rootDir });
}

async function main() {
  console.log('🚀 Building Astronomer...');
  
  try {
    await clean();
    compile();
    copyAssets();
    
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

main();