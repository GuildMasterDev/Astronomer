export interface EndpointConfig {
  url: string;
  method: 'GET' | 'POST';
  rateLimit: number;
  ttl: number;
}

export const ENDPOINTS: Record<string, EndpointConfig> = {
  'apod': {
    url: 'https://api.nasa.gov/planetary/apod',
    method: 'GET',
    rateLimit: 1000,
    ttl: 24 * 60 * 60 * 1000
  },
  
  'nasa-images': {
    url: 'https://images-api.nasa.gov/search',
    method: 'GET',
    rateLimit: 100,
    ttl: 6 * 60 * 60 * 1000
  },
  
  'epic': {
    url: 'https://api.nasa.gov/EPIC/api/natural',
    method: 'GET',
    rateLimit: 100,
    ttl: 6 * 60 * 60 * 1000
  },
  
  'horizons': {
    url: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    method: 'GET',
    rateLimit: 50,
    ttl: 60 * 60 * 1000
  },
  
  'iss-position': {
    url: 'https://api.wheretheiss.at/v1/satellites/25544',
    method: 'GET',
    rateLimit: 10,
    ttl: 10 * 1000
  },
  
  'exoplanets': {
    url: 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync',
    method: 'GET',
    rateLimit: 100,
    ttl: 24 * 60 * 60 * 1000
  }
};

export function getEndpointConfig(endpointId: string): EndpointConfig | undefined {
  return ENDPOINTS[endpointId];
}