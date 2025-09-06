import Store from 'electron-store';

interface StoreSchema {
  apiKeys: {
    nasa: string;
  };
  settings: {
    theme: 'dark' | 'light';
    units: 'metric' | 'imperial';
    location: {
      latitude: number;
      longitude: number;
      timezone: string;
      name: string;
    };
    safeMode: boolean;
    reduceMotion: boolean;
  };
  favorites: Array<{
    id: string;
    type: 'apod' | 'image' | 'object' | 'observation';
    data: any;
    timestamp: number;
  }>;
  cache: {
    [key: string]: {
      data: any;
      timestamp: number;
      ttl: number;
    };
  };
}

const store = new Store<StoreSchema>({
  defaults: {
    apiKeys: {
      nasa: 'DEMO_KEY'
    },
    settings: {
      theme: 'dark',
      units: 'metric',
      location: {
        latitude: 39.7392,
        longitude: -104.9903,
        timezone: 'America/Denver',
        name: 'Denver, CO'
      },
      safeMode: false,
      reduceMotion: false
    },
    favorites: [],
    cache: {}
  },
  encryptionKey: 'astronomer-secure-key',
  clearInvalidConfig: true
});

export function initializeStore() {
  // Clean expired cache on startup
  const cache = store.get('cache');
  const now = Date.now();
  const cleanedCache: typeof cache = {};
  
  for (const [key, value] of Object.entries(cache)) {
    if (now - value.timestamp < value.ttl) {
      cleanedCache[key] = value;
    }
  }
  
  store.set('cache', cleanedCache);
}

export { store };