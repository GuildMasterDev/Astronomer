import { ipcMain, shell, dialog, app } from 'electron';
import { store } from './store';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getEndpointConfig } from './endpoints';
import { rateLimiter } from './rate-limiter';

// API fetch handler
ipcMain.handle('api-fetch', async (event, endpointId: string, params: any) => {
  return rateLimiter.throttle(async () => {
  try {
    const config = getEndpointConfig(endpointId);
    if (!config) {
      throw new Error(`Unknown endpoint: ${endpointId}`);
    }

    // Build URL with params
    const url = new URL(config.url);
    if (config.method === 'GET' && params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Make request using Electron's net module
    const { net } = require('electron');
    const request = net.request({
      method: config.method,
      url: url.toString()
    });

    request.setHeader('User-Agent', 'Astronomer/1.0.0');
    request.setHeader('Accept', 'application/json');

    return new Promise((resolve) => {
      let data = '';
      
      request.on('response', (response: any) => {
        if (response.statusCode === 429) {
          // Rate limited - return specific error
          resolve({ data: null, error: 'RATE_LIMITED', statusCode: 429 });
          return;
        }
        if (response.statusCode !== 200) {
          resolve({ data: null, error: `HTTP ${response.statusCode}: ${response.statusMessage}` });
          return;
        }
        
        response.on('data', (chunk: any) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ data: parsed, error: null });
          } catch (e) {
            resolve({ data: null, error: 'Invalid JSON response' });
          }
        });
      });
      
      request.on('error', (error: any) => {
        resolve({ data: null, error: error.message });
      });
      
      if (config.method === 'POST' && params) {
        request.write(JSON.stringify(params));
      }
      
      request.end();
    });
  } catch (error: any) {
    console.error('API fetch error:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
  });
});

// Store handlers
ipcMain.handle('store-get', async (event, key: string) => {
  return store.get(key as any);
});

ipcMain.handle('store-set', async (event, key: string, value: any) => {
  store.set(key as any, value);
  return true;
});

ipcMain.handle('store-delete', async (event, key: string) => {
  store.delete(key as any);
  return true;
});

// Favorites handlers
ipcMain.handle('favorites-add', async (event, item: any) => {
  const favorites = store.get('favorites') || [];
  const exists = favorites.some(f => f.id === item.id);
  
  if (!exists) {
    favorites.push(item);
    store.set('favorites', favorites);
  }
  
  return true;
});

ipcMain.handle('favorites-remove', async (event, id: string) => {
  const favorites = store.get('favorites') || [];
  const filtered = favorites.filter(f => f.id !== id);
  store.set('favorites', filtered);
  return true;
});

ipcMain.handle('favorites-get-all', async (event) => {
  return store.get('favorites') || [];
});

ipcMain.handle('favorites-export', async (event) => {
  const favorites = store.get('favorites') || [];
  
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Favorites',
    defaultPath: path.join(app.getPath('downloads'), 'astronomer-favorites.json'),
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (filePath) {
    await fs.writeFile(filePath, JSON.stringify(favorites, null, 2));
    return true;
  }
  
  return false;
});

// System handlers
ipcMain.handle('get-location', async (event) => {
  // This would normally use a geolocation service
  // For now, return the stored default
  const settings = store.get('settings');
  return settings?.location || null;
});

ipcMain.handle('open-external', async (event, url: string) => {
  // Validate URL before opening
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      await shell.openExternal(url);
      return true;
    }
  } catch (error) {
    console.error('Invalid URL:', url);
  }
  return false;
});

// Navigation IPC
ipcMain.on('navigate-to', (event, tabName: string) => {
  event.sender.send('navigate', tabName);
});

export function setupIPC() {
  console.log('IPC handlers initialized');
}