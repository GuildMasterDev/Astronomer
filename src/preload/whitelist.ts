interface EndpointConfig {
  url: string;
  method: 'GET' | 'POST';
  rateLimit: number;
  ttl: number;
  params?: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'date';
      required?: boolean;
      pattern?: RegExp;
      min?: number;
      max?: number;
    };
  };
}

const ENDPOINTS: Record<string, EndpointConfig> = {
  'apod': {
    url: 'https://api.nasa.gov/planetary/apod',
    method: 'GET',
    rateLimit: 1000,
    ttl: 24 * 60 * 60 * 1000,
    params: {
      api_key: { type: 'string', required: true },
      date: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/ },
      hd: { type: 'boolean' },
      count: { type: 'number', min: 1, max: 100 }
    }
  },
  
  'nasa-images': {
    url: 'https://images-api.nasa.gov/search',
    method: 'GET',
    rateLimit: 100,
    ttl: 6 * 60 * 60 * 1000,
    params: {
      q: { type: 'string' },
      media_type: { type: 'string', pattern: /^(image|video|audio)$/ },
      year_start: { type: 'string', pattern: /^\d{4}$/ },
      year_end: { type: 'string', pattern: /^\d{4}$/ },
      page: { type: 'number', min: 1 }
    }
  },
  
  'epic': {
    url: 'https://api.nasa.gov/EPIC/api/natural',
    method: 'GET',
    rateLimit: 100,
    ttl: 6 * 60 * 60 * 1000,
    params: {
      api_key: { type: 'string', required: true },
      date: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/ }
    }
  },
  
  'horizons': {
    url: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    method: 'GET',
    rateLimit: 50,
    ttl: 60 * 60 * 1000,
    params: {
      format: { type: 'string' },
      COMMAND: { type: 'string', required: true },
      EPHEM_TYPE: { type: 'string' },
      CENTER: { type: 'string' },
      START_TIME: { type: 'string' },
      STOP_TIME: { type: 'string' },
      STEP_SIZE: { type: 'string' }
    }
  },
  
  'iss-position': {
    url: 'https://api.wheretheiss.at/v1/satellites/25544',
    method: 'GET',
    rateLimit: 10,
    ttl: 10 * 1000,
    params: {}
  },
  
  'exoplanets': {
    url: 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync',
    method: 'GET',
    rateLimit: 100,
    ttl: 24 * 60 * 60 * 1000,
    params: {
      query: { type: 'string', required: true },
      format: { type: 'string' }
    }
  }
};

const rateLimitTracker = new Map<string, number[]>();

export function isWhitelisted(endpointId: string): boolean {
  return endpointId in ENDPOINTS;
}

export function validateRequest(endpointId: string, params: any): { valid: boolean; error?: string } {
  const config = ENDPOINTS[endpointId];
  if (!config) {
    return { valid: false, error: 'Unknown endpoint' };
  }

  // Check rate limit
  const now = Date.now();
  const key = endpointId;
  const requests = rateLimitTracker.get(key) || [];
  const recentRequests = requests.filter(t => now - t < 60000);
  
  if (recentRequests.length >= config.rateLimit) {
    return { valid: false, error: 'Rate limit exceeded' };
  }
  
  rateLimitTracker.set(key, [...recentRequests, now]);

  // Validate parameters
  if (config.params) {
    for (const [paramName, paramConfig] of Object.entries(config.params)) {
      const value = params[paramName];
      
      if (paramConfig.required && value === undefined) {
        return { valid: false, error: `Missing required parameter: ${paramName}` };
      }
      
      if (value !== undefined) {
        if (paramConfig.type === 'string' && typeof value !== 'string') {
          return { valid: false, error: `Parameter ${paramName} must be a string` };
        }
        
        if (paramConfig.type === 'number') {
          if (typeof value !== 'number') {
            return { valid: false, error: `Parameter ${paramName} must be a number` };
          }
          if (paramConfig.min !== undefined && value < paramConfig.min) {
            return { valid: false, error: `Parameter ${paramName} must be >= ${paramConfig.min}` };
          }
          if (paramConfig.max !== undefined && value > paramConfig.max) {
            return { valid: false, error: `Parameter ${paramName} must be <= ${paramConfig.max}` };
          }
        }
        
        if (paramConfig.type === 'boolean' && typeof value !== 'boolean') {
          return { valid: false, error: `Parameter ${paramName} must be a boolean` };
        }
        
        if (paramConfig.pattern && !paramConfig.pattern.test(value)) {
          return { valid: false, error: `Parameter ${paramName} has invalid format` };
        }
      }
    }
  }

  return { valid: true };
}

export function getEndpointConfig(endpointId: string): EndpointConfig | undefined {
  return ENDPOINTS[endpointId];
}