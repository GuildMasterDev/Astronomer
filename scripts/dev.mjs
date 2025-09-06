#!/usr/bin/env node

import { spawn } from 'child_process';
import { createServer } from 'vite';
import electron from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startRenderer() {
  const server = await createServer({
    root: path.join(__dirname, '../src/renderer'),
    server: {
      port: 5173
    }
  });
  
  await server.listen();
  server.printUrls();
  return server;
}

function startElectron() {
  const electronProcess = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  electronProcess.on('close', () => {
    process.exit();
  });

  return electronProcess;
}

async function main() {
  console.log('🚀 Starting Astronomer development server...');
  
  try {
    // Start Vite dev server for renderer
    const server = await startRenderer();
    
    // Wait a bit for server to be ready
    setTimeout(() => {
      // Start Electron
      const electron = startElectron();
      
      // Handle cleanup
      process.on('SIGINT', () => {
        electron.kill();
        server.close();
        process.exit();
      });
    }, 1000);
  } catch (error) {
    console.error('Failed to start development server:', error);
    process.exit(1);
  }
}

main();