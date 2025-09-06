export class SettingsView {
  constructor() {
    this.initialized = false;
    this.settings = {};
  }

  async activate() {
    if (!this.initialized) {
      this.init();
      this.initialized = true;
    }
    await this.loadSettings();
  }

  init() {
    // NASA API link
    document.getElementById('nasa-api-link')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.astronomer.system.openExternal('https://api.nasa.gov/');
    });

    // Save settings button
    document.getElementById('save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Clear cache button
    document.getElementById('clear-cache')?.addEventListener('click', () => {
      this.clearCache();
    });

    // Theme select
    document.getElementById('theme-select')?.addEventListener('change', (e) => {
      window.astronomerApp.themeManager.setTheme(e.target.value);
    });

    // Real-time updates for certain settings
    ['reduce-motion', 'safe-mode'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        this.updateRealtimeSettings();
      });
    });
  }

  async loadSettings() {
    try {
      const [apiKeys, settings] = await Promise.all([
        window.astronomer.store.get('apiKeys'),
        window.astronomer.store.get('settings')
      ]);

      this.settings = { apiKeys, settings };
      this.displaySettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  displaySettings() {
    // API Key
    const apiKeyInput = document.getElementById('nasa-api-key');
    if (apiKeyInput) {
      apiKeyInput.value = this.settings.apiKeys?.nasa || 'DEMO_KEY';
    }

    // Theme
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = this.settings.settings?.theme || 'dark';
    }

    // Units
    const unitsSelect = document.getElementById('units-select');
    if (unitsSelect) {
      unitsSelect.value = this.settings.settings?.units || 'metric';
    }

    // Reduce motion
    const reduceMotion = document.getElementById('reduce-motion');
    if (reduceMotion) {
      reduceMotion.checked = this.settings.settings?.reduceMotion || false;
    }

    // Safe mode
    const safeMode = document.getElementById('safe-mode');
    if (safeMode) {
      safeMode.checked = this.settings.settings?.safeMode || false;
    }

    // Location
    const location = this.settings.settings?.location;
    if (location) {
      const nameInput = document.getElementById('default-location-name');
      const latInput = document.getElementById('default-latitude');
      const lonInput = document.getElementById('default-longitude');
      
      if (nameInput) nameInput.value = location.name || '';
      if (latInput) latInput.value = location.latitude || '';
      if (lonInput) lonInput.value = location.longitude || '';
    }
  }

  async saveSettings() {
    try {
      // Gather all settings
      const apiKey = document.getElementById('nasa-api-key')?.value || 'DEMO_KEY';
      const theme = document.getElementById('theme-select')?.value || 'dark';
      const units = document.getElementById('units-select')?.value || 'metric';
      const reduceMotion = document.getElementById('reduce-motion')?.checked || false;
      const safeMode = document.getElementById('safe-mode')?.checked || false;
      
      const locationName = document.getElementById('default-location-name')?.value || 'Denver, CO';
      const latitude = parseFloat(document.getElementById('default-latitude')?.value) || 39.7392;
      const longitude = parseFloat(document.getElementById('default-longitude')?.value) || -104.9903;

      // Save API keys
      await window.astronomer.store.set('apiKeys', {
        nasa: apiKey
      });

      // Save settings
      await window.astronomer.store.set('settings', {
        theme,
        units,
        reduceMotion,
        safeMode,
        location: {
          name: locationName,
          latitude,
          longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });

      // Apply real-time changes
      if (reduceMotion) {
        document.body.setAttribute('data-reduce-motion', 'true');
      } else {
        document.body.removeAttribute('data-reduce-motion');
      }

      this.showSuccess('Settings saved successfully!');
    } catch (error) {
      this.showError('Failed to save settings: ' + error.message);
    }
  }

  updateRealtimeSettings() {
    const reduceMotion = document.getElementById('reduce-motion')?.checked;
    if (reduceMotion) {
      document.body.setAttribute('data-reduce-motion', 'true');
    } else {
      document.body.removeAttribute('data-reduce-motion');
    }
  }

  async clearCache() {
    if (confirm('Clear all cached data? This will require re-fetching all data.')) {
      try {
        await window.astronomer.api.clearCache();
        this.showSuccess('Cache cleared successfully!');
      } catch (error) {
        this.showError('Failed to clear cache: ' + error.message);
      }
    }
  }

  showSuccess(message) {
    const container = document.querySelector('.settings-container');
    if (container) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-success';
      alert.textContent = message;
      alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-primary);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        z-index: 1000;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(alert);
      
      setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alert.remove(), 300);
      }, 3000);
    }
  }

  showError(message) {
    const container = document.querySelector('.settings-container');
    if (container) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-error';
      alert.textContent = message;
      alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-secondary);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        z-index: 1000;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(alert);
      
      setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alert.remove(), 300);
      }, 3000);
    }
  }
}