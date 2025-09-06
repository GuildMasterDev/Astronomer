#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function startElectron() {
  const electronProcess = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production' // Run in production mode to load local files
    },
    cwd: path.join(__dirname, '..')
  });

  electronProcess.on('close', () => {
    process.exit();
  });

  return electronProcess;
}

async function main() {
  console.log('🚀 Starting Astronomer...');
  
  try {
    // Compile TypeScript first
    console.log('📦 Compiling TypeScript...');
    spawn('npx', ['tsc'], { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    }).on('close', (code) => {
      if (code === 0) {
        console.log('✅ Compilation complete');
        
        // Start Electron
        const electron = startElectron();
        
        // Handle cleanup
        process.on('SIGINT', () => {
          electron.kill();
          process.exit();
        });
      } else {
        console.error('❌ Compilation failed');
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

main();