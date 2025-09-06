import { getEndpointConfig } from './whitelist';

interface CacheEntry {
  data: any;
  timestamp: number;
  etag?: string;
}

export class CacheManager {
  private cache: Map<string, CacheEntry>;
  private maxSize: number = 100;

  constructor() {
    this.cache = new Map();
  }

  async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const endpointId = key.split(':')[0];
    const config = getEndpointConfig(endpointId);
    if (!config) return null;

    const age = Date.now() - entry.timestamp;
    if (age > config.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set(key: string, data: any, endpointId?: string): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getStats(): Promise<{ size: number; keys: string[] }> {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}