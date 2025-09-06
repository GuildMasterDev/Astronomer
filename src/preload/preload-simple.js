const { contextBridge, ipcRenderer } = require('electron');

// Simple API that works
contextBridge.exposeInMainWorld('astronomer', {
  api: {
    fetch: async (endpointId, params = {}, retries = 3) => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const result = await ipcRenderer.invoke('api-fetch', endpointId, params);
          
          if (result.error === 'RATE_LIMITED' && attempt < retries - 1) {
            // Rate limited - wait with exponential backoff
            const waitTime = Math.min(5000 * Math.pow(2, attempt), 30000); // 5s, 10s, 20s, max 30s
            console.log(`Rate limited. Waiting ${waitTime/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          if (result.error) {
            throw new Error(result.error);
          }
          return result.data;
        } catch (error) {
          if (attempt === retries - 1) {
            console.error('API fetch error after retries:', error);
            throw error;
          }
        }
      }
    },
    clearCache: () => ipcRenderer.invoke('api-clear-cache')
  },

  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key)
  },

  favorites: {
    add: (item) => ipcRenderer.invoke('favorites-add', item),
    remove: (id) => ipcRenderer.invoke('favorites-remove', id),
    getAll: () => ipcRenderer.invoke('favorites-get-all'),
    export: () => ipcRenderer.invoke('favorites-export')
  },

  system: {
    getLocation: () => ipcRenderer.invoke('get-location'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    getPlatform: () => process.platform
  }
});

console.log('Preload script loaded successfully!');