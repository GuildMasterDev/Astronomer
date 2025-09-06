import { contextBridge, ipcRenderer } from 'electron';
import { validateRequest, isWhitelisted } from './whitelist';
import { CacheManager } from './cache';

const cache = new CacheManager();

const astronomerAPI = {
  api: {
    fetch: async (endpointId: string, params: any = {}) => {
      if (!isWhitelisted(endpointId)) {
        throw new Error(`Endpoint ${endpointId} is not whitelisted`);
      }

      const validation = validateRequest(endpointId, params);
      if (!validation.valid) {
        throw new Error(`Invalid request parameters: ${validation.error}`);
      }

      const cacheKey = `${endpointId}:${JSON.stringify(params)}`;
      const cached = await cache.get(cacheKey);
      
      if (cached && !params.noCache) {
        return cached;
      }

      try {
        const result = await ipcRenderer.invoke('api-fetch', endpointId, params);
        
        if (result.error) {
          throw new Error(result.error);
        }

        await cache.set(cacheKey, result.data, endpointId);
        return result.data;
      } catch (error) {
        if (cached) {
          console.warn('Using cached data due to fetch error:', error);
          return cached;
        }
        throw error;
      }
    },
    
    clearCache: async () => {
      await cache.clear();
    }
  },

  store: {
    get: (key: string) => ipcRenderer.invoke('store-get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store-delete', key)
  },

  favorites: {
    add: (item: any) => ipcRenderer.invoke('favorites-add', item),
    remove: (id: string) => ipcRenderer.invoke('favorites-remove', id),
    getAll: () => ipcRenderer.invoke('favorites-get-all'),
    export: () => ipcRenderer.invoke('favorites-export')
  },

  navigation: {
    switchTab: (tabName: string) => ipcRenderer.send('navigate-to', tabName),
    onNavigate: (callback: (tabName: string) => void) => {
      ipcRenderer.on('navigate', (_, tabName) => callback(tabName));
    }
  },

  system: {
    getLocation: () => ipcRenderer.invoke('get-location'),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    getPlatform: () => process.platform
  }
};

contextBridge.exposeInMainWorld('astronomer', astronomerAPI);

export type AstronomerAPI = typeof astronomerAPI;