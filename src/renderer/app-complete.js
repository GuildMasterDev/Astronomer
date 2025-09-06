// Complete Astronomer App with all features
(function() {
  'use strict';

  class AstronomerApp {
    constructor() {
      this.currentTab = 'explore';
      this.apodData = null;
      this.favorites = [];
      this.settings = {
        theme: 'dark',
        units: 'metric',
        apiKey: 'DEMO_KEY'
      };
    }

    async init() {
      console.log('Initializing Astronomer app...');
      await this.loadSettings();
      await this.loadFavorites();
      this.setupTabs();
      this.setupTheme();
      this.setupSearch();
      this.showTab('explore');
      await this.loadAPOD();
    }

    async loadSettings() {
      try {
        const apiKeys = await window.astronomer.store.get('apiKeys');
        const settings = await window.astronomer.store.get('settings');
        if (apiKeys?.nasa) this.settings.apiKey = apiKeys.nasa;
        if (settings) Object.assign(this.settings, settings);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }

    async loadFavorites() {
      try {
        this.favorites = await window.astronomer.favorites.getAll() || [];
        this.updateFavoriteButtons();
      } catch (error) {
        console.error('Failed to load favorites:', error);
      }
    }

    setupTabs() {
      document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', async (e) => {
          const tab = e.currentTarget.getAttribute('data-tab');
          await this.showTab(tab);
        });
      });
    }

    async showTab(tabName) {
      // Update buttons
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
      });

      // Update content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
      });

      this.currentTab = tabName;

      // Load tab-specific content
      switch(tabName) {
        case 'explore':
          if (!this.apodData) await this.loadAPOD();
          break;
        case 'birthday':
          this.setupBirthday();
          break;
        case 'observe':
          await this.loadObservationData();
          break;
        case 'objects':
          await this.loadObjects();
          break;
        case 'favorites':
          await this.displayFavorites();
          break;
        case 'settings':
          this.displaySettings();
          break;
      }
    }

    setupTheme() {
      const themeToggle = document.querySelector('.theme-toggle');
      if (themeToggle) {
        themeToggle.addEventListener('click', () => {
          const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
          const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', newTheme);
          this.settings.theme = newTheme;
          this.saveSettings();
        });
      }
    }

    setupSearch() {
      // NASA Images search
      const searchBtn = document.getElementById('nasa-search-btn');
      const searchInput = document.getElementById('nasa-search');
      
      if (searchBtn) {
        searchBtn.onclick = () => this.searchNASAImages();
      }
      
      if (searchInput) {
        searchInput.onkeypress = (e) => {
          if (e.key === 'Enter') this.searchNASAImages();
        };
      }

      // EPIC button
      const epicBtn = document.getElementById('epic-fetch');
      if (epicBtn) {
        epicBtn.onclick = () => this.loadEPICImages();
      }
    }

    // ========== APOD Feature ==========
    async loadAPOD() {
      const container = document.getElementById('apod-content');
      if (!container) return;

      container.innerHTML = '<div class="loading-spinner">Loading NASA Picture of the Day...</div>';

      try {
        const data = await window.astronomer.api.fetch('apod', {
          api_key: this.settings.apiKey
        });

        if (data) {
          this.displayAPOD(data);
        }
      } catch (error) {
        console.error('Failed to load APOD:', error);
        container.innerHTML = `
          <div class="error-message">
            <h3>Failed to load</h3>
            <p>${error.message}</p>
            <button class="btn btn-primary" onclick="window.astronomerApp.loadAPOD()">Retry</button>
          </div>
        `;
      }
    }

    displayAPOD(data) {
      const container = document.getElementById('apod-content');
      if (!container) return;

      const isFavorited = this.favorites.some(f => f.id === data.date);

      const content = `
        <div class="apod-item">
          ${data.media_type === 'video' ? 
            `<iframe class="apod-video" src="${data.url}" frameborder="0" allowfullscreen></iframe>` :
            `<img class="apod-image" src="${data.url}" alt="${data.title}" onclick="window.astronomerApp.showImageModal('${data.hdurl || data.url}', '${data.title}')" style="cursor: pointer;" />`
          }
          <div class="apod-info">
            <h3 class="apod-title">${data.title}</h3>
            <p class="apod-date">${this.formatDate(data.date)}</p>
            <p class="apod-explanation">${data.explanation}</p>
            ${data.copyright ? `<p class="apod-copyright">© ${data.copyright}</p>` : ''}
            <button class="favorite-button ${isFavorited ? 'favorited' : ''}" 
                    onclick="window.astronomerApp.toggleFavorite('apod', '${data.date}', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
              ${isFavorited ? '★ Favorited' : '☆ Add to Favorites'}
            </button>
          </div>
        </div>
      `;

      container.innerHTML = content;
      this.apodData = data;
      this.setupAPODControls();
    }

    setupAPODControls() {
      const todayBtn = document.getElementById('apod-today');
      if (todayBtn) {
        todayBtn.onclick = () => this.loadAPOD();
      }

      const randomBtn = document.getElementById('apod-random');
      if (randomBtn) {
        randomBtn.onclick = async () => {
          const container = document.getElementById('apod-content');
          container.innerHTML = '<div class="loading-spinner">Loading random picture...</div>';
          
          try {
            const data = await window.astronomer.api.fetch('apod', {
              api_key: this.settings.apiKey,
              count: 1
            });
            
            if (Array.isArray(data) && data.length > 0) {
              this.displayAPOD(data[0]);
            }
          } catch (error) {
            console.error('Failed to load random APOD:', error);
          }
        };
      }

      const datePicker = document.getElementById('apod-date');
      if (datePicker) {
        datePicker.max = new Date().toISOString().split('T')[0];
        datePicker.onchange = async (e) => {
          const date = e.target.value;
          if (!date) return;

          const container = document.getElementById('apod-content');
          container.innerHTML = '<div class="loading-spinner">Loading...</div>';
          
          try {
            const data = await window.astronomer.api.fetch('apod', {
              api_key: this.settings.apiKey,
              date: date
            });
            this.displayAPOD(data);
          } catch (error) {
            console.error('Failed to load APOD for date:', error);
          }
        };
      }
    }

    // ========== NASA Images Search ==========
    async searchNASAImages() {
      const query = document.getElementById('nasa-search')?.value;
      const mediaType = document.getElementById('nasa-media-type')?.value;
      const grid = document.getElementById('nasa-images-grid');

      if (!query || !grid) return;

      grid.innerHTML = '<div class="loading-spinner">Searching NASA archives...</div>';

      try {
        const params = { q: query };
        if (mediaType) params.media_type = mediaType;

        const data = await window.astronomer.api.fetch('nasa-images', params);
        
        if (data?.collection?.items) {
          this.displayNASAImages(data.collection.items);
        }
      } catch (error) {
        console.error('Search failed:', error);
        grid.innerHTML = '<p>Search failed. Please try again.</p>';
      }
    }

    displayNASAImages(items) {
      const grid = document.getElementById('nasa-images-grid');
      if (!grid) return;

      if (items.length === 0) {
        grid.innerHTML = '<p>No images found</p>';
        return;
      }

      const cards = items.slice(0, 12).map(item => {
        const data = item.data[0];
        const imageUrl = item.links?.[0]?.href || '';
        const isFavorited = this.favorites.some(f => f.id === data.nasa_id);
        
        return `
          <div class="image-card">
            <img src="${imageUrl}" alt="${data.title}" 
                 onclick="window.astronomerApp.showImageModal('${imageUrl}', '${data.title.replace(/'/g, "\\'")}')" 
                 style="cursor: pointer;" />
            <div class="image-card-body">
              <h4 class="image-card-title">${data.title}</h4>
              <p class="image-card-description">${this.truncateText(data.description || '', 100)}</p>
              <button class="favorite-button ${isFavorited ? 'favorited' : ''}" 
                      onclick="window.astronomerApp.toggleFavorite('image', '${data.nasa_id}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                ${isFavorited ? '★' : '☆'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      grid.innerHTML = cards;
    }

    // ========== EPIC Images ==========
    async loadEPICImages() {
      const container = document.getElementById('epic-images');
      const dateInput = document.getElementById('epic-date');
      
      if (!container) return;

      container.innerHTML = '<div class="loading-spinner">Loading Earth images...</div>';

      try {
        const params = { api_key: this.settings.apiKey };
        if (dateInput?.value) params.date = dateInput.value;

        const data = await window.astronomer.api.fetch('epic', params);
        
        if (Array.isArray(data) && data.length > 0) {
          this.displayEPICImages(data);
        } else {
          container.innerHTML = '<p>No EPIC images available for this date</p>';
        }
      } catch (error) {
        console.error('Failed to load EPIC images:', error);
        container.innerHTML = '<p>Failed to load Earth images</p>';
      }
    }

    displayEPICImages(images) {
      const container = document.getElementById('epic-images');
      if (!container) return;

      const cards = images.slice(0, 6).map(img => {
        const date = img.date.split(' ')[0].replace(/-/g, '/');
        const imageUrl = `https://epic.gsfc.nasa.gov/archive/natural/${date}/png/${img.image}.png`;
        
        return `
          <div class="image-card">
            <img src="${imageUrl}" alt="Earth from EPIC" 
                 onclick="window.astronomerApp.showImageModal('${imageUrl}', 'Earth on ${img.date}')" 
                 style="cursor: pointer;" />
            <div class="image-card-body">
              <h4>Earth on ${this.formatDate(img.date)}</h4>
              <p>Lat: ${img.centroid_coordinates.lat.toFixed(2)}°, Lon: ${img.centroid_coordinates.lon.toFixed(2)}°</p>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = cards;
    }

    // ========== Birthday Feature ==========
    setupBirthday() {
      const monthSelect = document.getElementById('birthday-month');
      const daySelect = document.getElementById('birthday-day');
      const searchBtn = document.getElementById('birthday-search');

      if (monthSelect && !monthSelect.onchange) {
        monthSelect.onchange = (e) => {
          const month = e.target.value;
          daySelect.innerHTML = '<option value="">Day</option>';
          
          if (month) {
            const daysInMonth = new Date(2024, parseInt(month), 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
              const option = document.createElement('option');
              option.value = day.toString().padStart(2, '0');
              option.textContent = day.toString();
              daySelect.appendChild(option);
            }
          }
        };
      }

      if (searchBtn && !searchBtn.onclick) {
        searchBtn.onclick = () => this.searchBirthdayImages();
      }
    }

    async searchBirthdayImages() {
      const month = document.getElementById('birthday-month')?.value;
      const day = document.getElementById('birthday-day')?.value;
      const container = document.getElementById('birthday-results');

      if (!month || !day || !container) return;

      container.innerHTML = '<div class="loading-spinner">Searching Hubble archives...</div>';

      try {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        const params = {
          q: `Hubble ${monthNames[parseInt(month)]} ${parseInt(day)}`,
          media_type: 'image'
        };

        const data = await window.astronomer.api.fetch('nasa-images', params);
        
        if (data?.collection?.items?.length > 0) {
          this.displayBirthdayResults(data.collection.items, month, day);
        } else {
          container.innerHTML = '<p>No Hubble images found for this date. Try another date!</p>';
        }
      } catch (error) {
        console.error('Birthday search failed:', error);
        container.innerHTML = '<p>Search failed. Please try again.</p>';
      }
    }

    displayBirthdayResults(items, month, day) {
      const container = document.getElementById('birthday-results');
      if (!container) return;

      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];

      const hubbleImages = items.filter(item => 
        item.data[0].keywords?.some(k => k.toLowerCase().includes('hubble'))
      ).slice(0, 5);

      if (hubbleImages.length === 0) {
        container.innerHTML = '<p>No Hubble images found for this date</p>';
        return;
      }

      const content = `
        <h2>Hubble Images from ${monthNames[parseInt(month)]} ${parseInt(day)}</h2>
        <div class="birthday-carousel">
          ${hubbleImages.map((item, index) => {
            const data = item.data[0];
            const imageUrl = item.links?.[0]?.href || '';
            
            return `
              <div class="birthday-slide ${index === 0 ? 'active' : ''}" style="${index !== 0 ? 'display:none' : ''}">
                <img src="${imageUrl}" alt="${data.title}" />
                <div class="birthday-info">
                  <h3>${data.title}</h3>
                  <p>${this.truncateText(data.description || '', 200)}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${hubbleImages.length > 1 ? `
          <div class="birthday-navigation">
            <button onclick="window.astronomerApp.previousSlide()">←</button>
            <span id="slide-indicator">1 / ${hubbleImages.length}</span>
            <button onclick="window.astronomerApp.nextSlide()">→</button>
          </div>
        ` : ''}
      `;

      container.innerHTML = content;
      this.currentSlide = 0;
      this.totalSlides = hubbleImages.length;
    }

    previousSlide() {
      const slides = document.querySelectorAll('.birthday-slide');
      if (this.currentSlide > 0) {
        slides[this.currentSlide].style.display = 'none';
        this.currentSlide--;
        slides[this.currentSlide].style.display = 'block';
        document.getElementById('slide-indicator').textContent = 
          `${this.currentSlide + 1} / ${this.totalSlides}`;
      }
    }

    nextSlide() {
      const slides = document.querySelectorAll('.birthday-slide');
      if (this.currentSlide < this.totalSlides - 1) {
        slides[this.currentSlide].style.display = 'none';
        this.currentSlide++;
        slides[this.currentSlide].style.display = 'block';
        document.getElementById('slide-indicator').textContent = 
          `${this.currentSlide + 1} / ${this.totalSlides}`;
      }
    }

    // ========== Observe Tonight ==========
    async loadObservationData() {
      const container = document.getElementById('observation-data');
      if (!container) return;

      container.innerHTML = '<div class="loading-spinner">Calculating observation data...</div>';

      try {
        const location = await this.getLocation();
        const now = new Date();
        
        // Get ISS position
        let issData = null;
        try {
          issData = await window.astronomer.api.fetch('iss-position', {});
        } catch (e) {
          console.error('ISS fetch failed:', e);
        }

        const content = `
          <div class="observation-sections">
            <section class="obs-section">
              <h3>Current Conditions</h3>
              <p>Location: ${location.name}</p>
              <p>Time: ${now.toLocaleString()}</p>
              <p>Coordinates: ${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°</p>
            </section>

            <section class="obs-section">
              <h3>Moon Phase</h3>
              <p>${this.getMoonPhase(now)}</p>
              <p>Illumination: ${this.getMoonIllumination(now)}%</p>
            </section>

            <section class="obs-section">
              <h3>Best Viewing Times Tonight</h3>
              <p>Astronomical Twilight: ~9:00 PM</p>
              <p>Best Deep Sky: 10:00 PM - 2:00 AM</p>
              <p>Pre-Dawn: 4:00 AM - 5:30 AM</p>
            </section>

            ${issData ? `
              <section class="obs-section">
                <h3>ISS Current Position</h3>
                <p>Latitude: ${issData.latitude.toFixed(2)}°</p>
                <p>Longitude: ${issData.longitude.toFixed(2)}°</p>
                <p>Altitude: ${issData.altitude.toFixed(0)} km</p>
                <p>Velocity: ${issData.velocity.toFixed(0)} km/h</p>
              </section>
            ` : ''}

            <section class="obs-section">
              <h3>Visible Planets Tonight</h3>
              <p>Check your astronomy app for current planet positions</p>
              <ul>
                <li>Venus: Often visible after sunset or before sunrise</li>
                <li>Mars: Check eastern sky after midnight</li>
                <li>Jupiter: Usually visible most of the night</li>
                <li>Saturn: Best viewed in evening hours</li>
              </ul>
            </section>
          </div>
        `;

        container.innerHTML = content;
        this.setupLocationPicker();
      } catch (error) {
        console.error('Failed to load observation data:', error);
        container.innerHTML = '<p>Failed to load observation data</p>';
      }
    }

    setupLocationPicker() {
      const useLocationBtn = document.getElementById('use-location');
      if (useLocationBtn && !useLocationBtn.onclick) {
        useLocationBtn.onclick = async () => {
          if ('geolocation' in navigator) {
            useLocationBtn.textContent = 'Getting Location...';
            useLocationBtn.disabled = true;
            
            navigator.geolocation.getCurrentPosition(
              (position) => {
                document.getElementById('latitude').value = position.coords.latitude.toFixed(4);
                document.getElementById('longitude').value = position.coords.longitude.toFixed(4);
                document.getElementById('location-name').value = 'Current Location';
                useLocationBtn.textContent = 'Use My Location';
                useLocationBtn.disabled = false;
                this.loadObservationData();
              },
              (error) => {
                let errorMessage = 'Could not get your location. ';
                switch(error.code) {
                  case error.PERMISSION_DENIED:
                    errorMessage += 'Permission denied. Please allow location access.';
                    break;
                  case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information unavailable.';
                    break;
                  case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                  default:
                    errorMessage += 'An unknown error occurred.';
                }
                alert(errorMessage);
                useLocationBtn.textContent = 'Use My Location';
                useLocationBtn.disabled = false;
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              }
            );
          } else {
            alert('Geolocation is not supported by your browser');
          }
        };
      }
      // Set default values in the input fields
      this.getLocation().then(location => {
        const nameInput = document.getElementById('location-name');
        const latInput = document.getElementById('latitude');
        const lonInput = document.getElementById('longitude');
        if (nameInput && !nameInput.value) nameInput.value = location.name;
        if (latInput && !latInput.value) latInput.value = location.latitude;
        if (lonInput && !lonInput.value) lonInput.value = location.longitude;
      });
    }

    async getLocation() {
      const settings = await window.astronomer.store.get('settings');
      return settings?.location || {
        name: 'Denver, CO',
        latitude: 39.7392,
        longitude: -104.9903
      };
    }

    getMoonPhase(date) {
      const phase = ((date.getTime() / 1000 - 947182440) / 2551442.8) % 1;
      if (phase < 0.125) return '🌑 New Moon';
      else if (phase < 0.25) return '🌒 Waxing Crescent';
      else if (phase < 0.375) return '🌓 First Quarter';
      else if (phase < 0.5) return '🌔 Waxing Gibbous';
      else if (phase < 0.625) return '🌕 Full Moon';
      else if (phase < 0.75) return '🌖 Waning Gibbous';
      else if (phase < 0.875) return '🌗 Last Quarter';
      else return '🌘 Waning Crescent';
    }

    getMoonIllumination(date) {
      const phase = ((date.getTime() / 1000 - 947182440) / 2551442.8) % 1;
      return (Math.abs(Math.sin(phase * Math.PI)) * 100).toFixed(0);
    }

    // ========== Objects ==========
    async loadObjects() {
      const container = document.getElementById('objects-grid');
      if (!container) return;

      const solarSystem = [
        { name: 'Sun', type: 'Star', distance: 149597870.7, diameter: 1391400, icon: '☀️' },
        { name: 'Mercury', type: 'Planet', distance: 77300000, diameter: 4879, icon: '🪐' },
        { name: 'Venus', type: 'Planet', distance: 108200000, diameter: 12104, icon: '🪐' },
        { name: 'Earth', type: 'Planet', distance: 149597870.7, diameter: 12756, icon: '🌍' },
        { name: 'Moon', type: 'Satellite', distance: 384400, diameter: 3475, icon: '🌙' },
        { name: 'Mars', type: 'Planet', distance: 227900000, diameter: 6792, icon: '🔴' },
        { name: 'Jupiter', type: 'Planet', distance: 778500000, diameter: 142984, icon: '🪐' },
        { name: 'Saturn', type: 'Planet', distance: 1434000000, diameter: 120536, icon: '🪐' },
        { name: 'Uranus', type: 'Planet', distance: 2873000000, diameter: 51118, icon: '🪐' },
        { name: 'Neptune', type: 'Planet', distance: 4495000000, diameter: 49528, icon: '🪐' }
      ];

      const content = `
        <h2>Solar System Objects</h2>
        <div class="objects-cards">
          ${solarSystem.map(obj => {
            const isFavorited = this.favorites.some(f => f.id === obj.name);
            return `
              <div class="object-card">
                <div class="object-icon" style="font-size: 48px;">${obj.icon}</div>
                <div class="object-card-body">
                  <h3>${obj.name}</h3>
                  <p class="object-type">${obj.type}</p>
                  <p>Distance: ${this.formatDistance(obj.distance)}</p>
                  <p>Diameter: ${obj.diameter.toLocaleString()} km</p>
                  <button class="favorite-button ${isFavorited ? 'favorited' : ''}" 
                          onclick="window.astronomerApp.toggleFavorite('object', '${obj.name}', ${JSON.stringify(obj).replace(/"/g, '&quot;')})">
                    ${isFavorited ? '★ Favorited' : '☆ Favorite'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      container.innerHTML = content;
    }

    // ========== Favorites ==========
    async displayFavorites() {
      const container = document.getElementById('favorites-grid');
      if (!container) return;

      await this.loadFavorites();

      if (this.favorites.length === 0) {
        container.innerHTML = `
          <div class="empty-favorites">
            <h3>No favorites yet</h3>
            <p>Click the star icon on any item to add it to your favorites</p>
          </div>
        `;
        return;
      }

      const cards = this.favorites.map(fav => {
        const data = fav.data;
        let title = data.title || data.name || 'Unknown';
        let image = '';
        
        if (fav.type === 'apod' && data.media_type === 'image') {
          image = `<img src="${data.url}" alt="${title}" />`;
        } else if (fav.type === 'image' && data.links?.[0]?.href) {
          image = `<img src="${data.links[0].href}" alt="${title}" />`;
        } else if (fav.type === 'object') {
          image = `<div style="font-size: 64px; text-align: center; padding: 20px;">${data.icon || '🌟'}</div>`;
        }

        return `
          <div class="favorite-card">
            ${image}
            <div class="favorite-card-body">
              <h4>${title}</h4>
              <p class="favorite-type">${fav.type}</p>
              <button class="btn btn-secondary" 
                      onclick="window.astronomerApp.removeFavorite('${fav.id}')">
                Remove
              </button>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = cards;

      // Setup export button
      const exportBtn = document.getElementById('export-favorites');
      if (exportBtn && !exportBtn.onclick) {
        exportBtn.onclick = () => this.exportFavorites();
      }

      const clearBtn = document.getElementById('clear-favorites');
      if (clearBtn && !clearBtn.onclick) {
        clearBtn.onclick = () => this.clearFavorites();
      }
    }

    async toggleFavorite(type, id, data) {
      const existing = this.favorites.find(f => f.id === id);
      
      if (existing) {
        await window.astronomer.favorites.remove(id);
        this.favorites = this.favorites.filter(f => f.id !== id);
      } else {
        const item = { id, type, data, timestamp: Date.now() };
        await window.astronomer.favorites.add(item);
        this.favorites.push(item);
      }

      this.updateFavoriteButtons();
      
      if (this.currentTab === 'favorites') {
        await this.displayFavorites();
      }
    }

    async removeFavorite(id) {
      await window.astronomer.favorites.remove(id);
      this.favorites = this.favorites.filter(f => f.id !== id);
      await this.displayFavorites();
    }

    async exportFavorites() {
      try {
        await window.astronomer.favorites.export();
        alert('Favorites exported successfully!');
      } catch (error) {
        alert('Failed to export favorites');
      }
    }

    async clearFavorites() {
      if (confirm('Clear all favorites?')) {
        for (const fav of this.favorites) {
          await window.astronomer.favorites.remove(fav.id);
        }
        this.favorites = [];
        await this.displayFavorites();
      }
    }

    updateFavoriteButtons() {
      // This would update all favorite buttons on the page
      // For now, we handle it inline in the display methods
    }

    // ========== Settings ==========
    displaySettings() {
      const apiKeyInput = document.getElementById('nasa-api-key');
      const themeSelect = document.getElementById('theme-select');
      const unitsSelect = document.getElementById('units-select');
      const saveBtn = document.getElementById('save-settings');

      if (apiKeyInput) apiKeyInput.value = this.settings.apiKey;
      if (themeSelect) themeSelect.value = this.settings.theme;
      if (unitsSelect) unitsSelect.value = this.settings.units;

      if (saveBtn && !saveBtn.onclick) {
        saveBtn.onclick = () => this.saveSettings();
      }

      const clearCacheBtn = document.getElementById('clear-cache');
      if (clearCacheBtn && !clearCacheBtn.onclick) {
        clearCacheBtn.onclick = async () => {
          await window.astronomer.api.clearCache();
          alert('Cache cleared!');
        };
      }
    }

    async saveSettings() {
      const apiKey = document.getElementById('nasa-api-key')?.value || 'DEMO_KEY';
      const theme = document.getElementById('theme-select')?.value || 'dark';
      const units = document.getElementById('units-select')?.value || 'metric';

      this.settings = { apiKey, theme, units };

      await window.astronomer.store.set('apiKeys', { nasa: apiKey });
      await window.astronomer.store.set('settings', { theme, units });

      document.documentElement.setAttribute('data-theme', theme);
      alert('Settings saved!');
    }

    // ========== Utilities ==========
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    formatDistance(km) {
      if (this.settings.units === 'imperial') {
        const miles = km * 0.621371;
        return `${miles.toLocaleString()} mi`;
      }
      return `${km.toLocaleString()} km`;
    }

    truncateText(text, maxLength) {
      if (!text || text.length <= maxLength) return text;
      return text.substr(0, maxLength) + '...';
    }

    showImageModal(imageUrl, title) {
      const modal = document.getElementById('modal');
      const modalBody = document.getElementById('modal-body');
      
      if (modal && modalBody) {
        modalBody.innerHTML = `
          <h2>${title}</h2>
          <img src="${imageUrl}" style="max-width: 100%; height: auto;" />
        `;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
      }
    }

    closeModal() {
      const modal = document.getElementById('modal');
      if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      }
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating app...');
    const app = new AstronomerApp();
    window.astronomerApp = app;
    app.init().catch(console.error);

    // Setup modal close
    document.querySelector('.modal-close')?.addEventListener('click', () => {
      app.closeModal();
    });

    document.getElementById('modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal') {
        app.closeModal();
      }
    });
  });
})();