// Complete Astronomer App with all features
(function() {
  'use strict';

  const PLANET_COLORS = {
    Mercury: '#b5b1a6',
    Venus: '#f2e2b6',
    Mars: '#e06a4c',
    Jupiter: '#d9a26c',
    Saturn: '#e8d090'
  };

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
      this.setupNightVision();
      this.setupSearch();
      this.setupActionDelegation();
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

    async setupNightVision() {
      const toggle = document.getElementById('night-vision-toggle');
      if (!toggle) return;

      const apply = (on) => {
        document.body.classList.toggle('night-vision', !!on);
        toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
        // Redraw the sky chart so canvas colors match the new mode.
        if (this.lastSkyData) this.renderSkyChart(this.lastSkyData, this.lastIssData);
      };

      try {
        const stored = await window.astronomer.store.get('nightVision');
        apply(stored === true);
      } catch (e) {
        apply(false);
      }

      toggle.addEventListener('click', () => {
        const next = !document.body.classList.contains('night-vision');
        apply(next);
        window.astronomer.store.set('nightVision', next).catch(err =>
          console.error('Failed to persist night vision setting:', err)
        );
      });
    }

    setupActionDelegation() {
      // Single delegated click handler — CSP blocks inline onclick=, so every
      // button rendered via innerHTML uses data-action + data-* args that we
      // dispatch here.
      document.addEventListener('click', (event) => {
        const el = event.target.closest('[data-action]');
        if (!el) return;
        const action = el.dataset.action;
        const payload = el.dataset.payload ? this.safeParseJSON(el.dataset.payload) : null;

        switch (action) {
          case 'retry-apod':
            this.loadAPOD();
            break;
          case 'show-image':
            event.preventDefault();
            this.showImageModal(el.dataset.url, el.dataset.title || '');
            break;
          case 'toggle-favorite':
            event.preventDefault();
            event.stopPropagation();
            this.toggleFavorite(el.dataset.favType, el.dataset.favId, payload);
            break;
          case 'remove-favorite':
            event.preventDefault();
            this.removeFavorite(el.dataset.favId);
            break;
          case 'track-tonight':
            this.trackTonight(el.dataset.body);
            break;
          case 'birthday-prev':
            this.previousSlide();
            break;
          case 'birthday-next':
            this.nextSlide();
            break;
          case 'open-external':
            event.preventDefault();
            this.openExternal(el.dataset.url);
            break;
        }
      });
    }

    safeParseJSON(str) {
      try { return JSON.parse(str); } catch (e) { return null; }
    }

    attr(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    payloadAttr(obj) {
      return this.attr(JSON.stringify(obj));
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
            <button class="btn btn-primary" data-action="retry-apod">Retry</button>
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
            `<img class="apod-image" src="${this.attr(data.url)}" alt="${this.attr(data.title)}" data-action="show-image" data-url="${this.attr(data.hdurl || data.url)}" data-title="${this.attr(data.title)}" style="cursor: pointer;" />`
          }
          <div class="apod-info">
            <h3 class="apod-title">${data.title}</h3>
            <p class="apod-date">${this.formatDate(data.date)}</p>
            <p class="apod-explanation">${data.explanation}</p>
            ${data.copyright ? `<p class="apod-copyright">© ${data.copyright}</p>` : ''}
            <button class="favorite-button ${isFavorited ? 'favorited' : ''}"
                    data-action="toggle-favorite" data-fav-type="apod" data-fav-id="${this.attr(data.date)}"
                    data-payload="${this.payloadAttr(data)}">
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
            <img src="${this.attr(imageUrl)}" alt="${this.attr(data.title)}"
                 data-action="show-image" data-url="${this.attr(imageUrl)}" data-title="${this.attr(data.title)}"
                 style="cursor: pointer;" />
            <div class="image-card-body">
              <h4 class="image-card-title">${data.title}</h4>
              <p class="image-card-description">${this.truncateText(data.description || '', 100)}</p>
              <button class="favorite-button ${isFavorited ? 'favorited' : ''}"
                      data-action="toggle-favorite" data-fav-type="image" data-fav-id="${this.attr(data.nasa_id)}"
                      data-payload="${this.payloadAttr(item)}">
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
            <img src="${this.attr(imageUrl)}" alt="Earth from EPIC"
                 data-action="show-image" data-url="${this.attr(imageUrl)}" data-title="Earth on ${this.attr(img.date)}"
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

      container.innerHTML = '<div class="loading-spinner">Fetching APOD archives for your birthday…</div>';

      const years = [2024, 2023, 2022, 2021, 2020, 2019];
      try {
        const results = await Promise.all(
          years.map(year =>
            window.astronomer.api
              .fetch('apod', { api_key: this.settings.apiKey, date: `${year}-${month}-${day}` })
              .then(data => ({ year, data }))
              .catch(err => {
                console.warn(`APOD fetch for ${year}-${month}-${day} failed:`, err?.message || err);
                return null;
              })
          )
        );

        const slides = results
          .filter(r => r && r.data && (r.data.url || r.data.hdurl))
          .map(r => ({
            year: r.year,
            title: r.data.title || 'Untitled',
            explanation: r.data.explanation || '',
            mediaType: r.data.media_type || 'image',
            url: r.data.url,
            hdurl: r.data.hdurl,
            date: r.data.date
          }));

        if (slides.length === 0) {
          container.innerHTML = '<p>No APOD entries found for this date. Try another date!</p>';
          return;
        }

        this.displayBirthdayResults(slides, month, day);
      } catch (error) {
        console.error('Birthday search failed:', error);
        container.innerHTML = '<p>Search failed. Please try again.</p>';
      }
    }

    displayBirthdayResults(slides, month, day) {
      const container = document.getElementById('birthday-results');
      if (!container) return;

      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];

      const safe = (s) => String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');

      const slidesHtml = slides.map((s, i) => {
        const media = s.mediaType === 'video'
          ? `<div class="birthday-video"><a href="#" data-action="open-external" data-url="${this.attr(s.url)}">Watch on NASA APOD →</a></div>`
          : `<img src="${safe(s.hdurl || s.url)}" alt="${safe(s.title)}" />`;
        return `
          <div class="birthday-slide" data-index="${i}">
            ${media}
            <div class="birthday-info">
              <p class="birthday-year">On your birthday in ${s.year}, NASA featured:</p>
              <h3>${safe(s.title)}</h3>
              <p>${this.truncateText(s.explanation, 280)}</p>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <h2>APOD on ${monthNames[parseInt(month)]} ${parseInt(day)}</h2>
        <div class="birthday-carousel">
          <div class="birthday-slides">${slidesHtml}</div>
        </div>
        ${slides.length > 1 ? `
          <div class="birthday-navigation">
            <button class="btn btn-secondary" data-action="birthday-prev">←</button>
            <span id="slide-indicator">1 / ${slides.length}</span>
            <button class="btn btn-secondary" data-action="birthday-next">→</button>
          </div>
        ` : ''}
      `;

      this.currentSlide = 0;
      this.totalSlides = slides.length;
      this.updateBirthdaySlides();
    }

    updateBirthdaySlides() {
      const slides = document.querySelectorAll('.birthday-slide');
      slides.forEach((el, i) => {
        el.classList.toggle('active', i === this.currentSlide);
      });
      const indicator = document.getElementById('slide-indicator');
      if (indicator) indicator.textContent = `${this.currentSlide + 1} / ${this.totalSlides}`;
    }

    previousSlide() {
      if (this.currentSlide > 0) {
        this.currentSlide--;
        this.updateBirthdaySlides();
      }
    }

    nextSlide() {
      if (this.currentSlide < this.totalSlides - 1) {
        this.currentSlide++;
        this.updateBirthdaySlides();
      }
    }

    openExternal(url) {
      try { window.astronomer.system.openExternal(url); } catch (e) { console.error(e); }
    }

    // ========== Observe Tonight ==========
    async loadObservationData() {
      const container = document.getElementById('observation-data');
      if (!container) return;

      container.innerHTML = '<div class="loading-spinner">Calculating observation data...</div>';

      try {
        const location = await this.getLocation();
        const now = new Date();

        const observer = { latitude: location.latitude, longitude: location.longitude };
        const [astroResult, issResult] = await Promise.all([
          window.astronomer.astronomy.compute(observer, now),
          window.astronomer.iss.passes(observer, now).catch(e => {
            console.error('ISS pass computation failed:', e);
            return null;
          })
        ]);

        if (!astroResult || astroResult.error || !astroResult.data) {
          throw new Error(astroResult?.error || 'No astronomy data');
        }
        const astro = astroResult.data;
        const iss = issResult && !issResult.error ? issResult.data : null;
        this.renderSkyChart(astro, iss);

        const fmtTime = iso =>
          iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
        const fmtNum = (n, d = 1) => (typeof n === 'number' ? n.toFixed(d) : '—');

        const visiblePlanets = astro.planets.filter(p => p.visible);
        const planetsHtml = visiblePlanets.length === 0
          ? `<p>No planets currently above the horizon at ${location.name}.</p>
             <ul>${astro.planets.map(p =>
               `<li>${p.name}: rises ${fmtTime(p.rise)}, sets ${fmtTime(p.set)} (mag ${fmtNum(p.magnitude, 2)})</li>`
             ).join('')}</ul>`
          : `<ul class="planet-list">${visiblePlanets.map(p => `
              <li>
                <strong>${p.name}</strong> — alt ${fmtNum(p.altitude)}°, az ${fmtNum(p.azimuth)}°,
                mag ${fmtNum(p.magnitude, 2)}
                <br><small>Rise ${fmtTime(p.rise)} · Set ${fmtTime(p.set)}</small>
              </li>
            `).join('')}</ul>`;

        const content = `
          <div class="observation-sections">
            <section class="obs-section">
              <h3>Current Conditions</h3>
              <p>Location: ${location.name}</p>
              <p>Time: ${now.toLocaleString()}</p>
              <p>Coordinates: ${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°</p>
            </section>

            <section class="obs-section">
              <h3>Sun</h3>
              <p>Rise: ${fmtTime(astro.sun.rise)} · Set: ${fmtTime(astro.sun.set)}</p>
              <p>Current altitude: ${fmtNum(astro.sun.altitude)}° · Azimuth: ${fmtNum(astro.sun.azimuth)}°</p>
            </section>

            <section class="obs-section">
              <h3>Twilight (dusk)</h3>
              <p>Sunset: ${fmtTime(astro.twilight.sunset)}</p>
              <p>Civil (-6°): ${fmtTime(astro.twilight.civil)}</p>
              <p>Nautical (-12°): ${fmtTime(astro.twilight.nautical)}</p>
              <p>Astronomical (-18°): ${fmtTime(astro.twilight.astronomical)}</p>
            </section>

            <section class="obs-section">
              <h3>Moon</h3>
              <p>Phase: ${astro.moon.phase}</p>
              <p>Illumination: ${fmtNum(astro.moon.illumination)}%</p>
              <p>Rise: ${fmtTime(astro.moon.rise)} · Set: ${fmtTime(astro.moon.set)}</p>
              <p>Current altitude: ${fmtNum(astro.moon.altitude)}° · Azimuth: ${fmtNum(astro.moon.azimuth)}°</p>
            </section>

            <section class="obs-section">
              <h3>Visible Planets Tonight</h3>
              ${planetsHtml}
            </section>

            ${iss ? `
              <section class="obs-section">
                <h3>International Space Station</h3>
                ${iss.current && Number.isFinite(iss.current.latitude) ? `
                  <p>Sub-satellite point: ${iss.current.latitude.toFixed(2)}°, ${iss.current.longitude.toFixed(2)}° · ${fmtNum(iss.current.altitudeKm, 0)} km up</p>
                  ${typeof iss.current.observerAltitude === 'number' && iss.current.observerAltitude > 0
                    ? `<p><strong>Overhead now</strong> — alt ${fmtNum(iss.current.observerAltitude)}°, az ${fmtNum(iss.current.observerAzimuth)}°</p>`
                    : '<p>Currently below your horizon.</p>'}
                ` : ''}
                <h4>Next visible passes (next 48h)</h4>
                ${iss.passes.length === 0
                  ? '<p>No visible passes in the next 48 hours at this location.</p>'
                  : `<ul class="iss-pass-list">${iss.passes.map(p => `
                      <li>
                        <strong>${fmtTime(p.start)}</strong> — ${Math.round(p.durationSec / 60)} min
                        · peak ${fmtNum(p.maxElevation)}° ${p.direction}
                        <br><small>Start ${fmtTime(p.start)} · Peak ${fmtTime(p.maxElevationAt)} · End ${fmtTime(p.end)}</small>
                      </li>
                    `).join('')}</ul>`}
              </section>
            ` : ''}
          </div>
        `;

        container.innerHTML = content;
        this.setupLocationPicker();
      } catch (error) {
        console.error('Failed to load observation data:', error);
        container.innerHTML = `<p>Failed to load observation data: ${error.message}</p>`;
      }
    }

    setupLocationPicker() {
      const useLocationBtn = document.getElementById('use-location');
      const latInput = document.getElementById('latitude');
      const lonInput = document.getElementById('longitude');

      if (useLocationBtn && !useLocationBtn.onclick) {
        useLocationBtn.onclick = async () => {
          if (!('geolocation' in navigator)) {
            alert('Geolocation is not supported by your browser');
            return;
          }
          useLocationBtn.textContent = 'Getting Location...';
          useLocationBtn.disabled = true;

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;
              latInput.value = lat.toFixed(4);
              lonInput.value = lon.toFixed(4);
              document.getElementById('location-name').value = 'Current Location';
              useLocationBtn.textContent = 'Use My Location';
              useLocationBtn.disabled = false;
              this.setMapLocation(lat, lon, { pan: true });
              this.loadObservationData();
            },
            (error) => {
              const reasons = {
                [error.PERMISSION_DENIED]: 'Permission denied. Please allow location access.',
                [error.POSITION_UNAVAILABLE]: 'Location information unavailable.',
                [error.TIMEOUT]: 'Location request timed out.'
              };
              alert('Could not get your location. ' + (reasons[error.code] || 'An unknown error occurred.'));
              useLocationBtn.textContent = 'Use My Location';
              useLocationBtn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        };
      }

      // Seed inputs from stored/default location
      this.getLocation().then(location => {
        const nameInput = document.getElementById('location-name');
        if (nameInput && !nameInput.value) nameInput.value = location.name;
        if (latInput && !latInput.value) latInput.value = location.latitude;
        if (lonInput && !lonInput.value) lonInput.value = location.longitude;
        this.initObserveMap();
      });

      // Input-driven updates move the marker and recalc observations.
      if (latInput && !latInput.dataset.mapBound) {
        latInput.dataset.mapBound = '1';
        lonInput.dataset.mapBound = '1';
        const onInputChange = () => {
          const lat = parseFloat(latInput.value);
          const lon = parseFloat(lonInput.value);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            this.setMapLocation(lat, lon, { pan: true });
            this.loadObservationData();
          }
        };
        latInput.addEventListener('change', onInputChange);
        lonInput.addEventListener('change', onInputChange);
      }
    }

    async initObserveMap() {
      const container = document.getElementById('observe-map');
      if (!container || this.observeMap || typeof L === 'undefined') return;

      // Leaflet ships marker icons as separate assets — point them at the
      // locally-vendored copies so file:// loads resolve correctly.
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'vendor/leaflet/images/marker-icon-2x.png',
        iconUrl: 'vendor/leaflet/images/marker-icon.png',
        shadowUrl: 'vendor/leaflet/images/marker-shadow.png'
      });

      const location = await this.getLocation();
      const map = L.map(container, {
        center: [location.latitude, location.longitude],
        zoom: 6,
        worldCopyJump: true
      });

      L.tileLayer('https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([location.latitude, location.longitude], { draggable: true }).addTo(map);

      const applyLatLng = (latlng, { recompute }) => {
        const lat = latlng.lat;
        const lon = latlng.lng;
        const latInput = document.getElementById('latitude');
        const lonInput = document.getElementById('longitude');
        if (latInput) latInput.value = lat.toFixed(4);
        if (lonInput) lonInput.value = lon.toFixed(4);
        if (recompute) this.loadObservationData();
      };

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        applyLatLng(e.latlng, { recompute: true });
      });

      marker.on('dragend', () => {
        applyLatLng(marker.getLatLng(), { recompute: true });
      });

      this.observeMap = map;
      this.observeMarker = marker;

      // Leaflet needs a size recalc if the container was hidden when first created.
      setTimeout(() => map.invalidateSize(), 0);
    }

    setMapLocation(lat, lon, { pan = false } = {}) {
      if (!this.observeMap || !this.observeMarker) return;
      const latlng = [lat, lon];
      this.observeMarker.setLatLng(latlng);
      if (pan) this.observeMap.panTo(latlng);
    }

    renderSkyChart(astro, iss = null) {
      const canvas = document.getElementById('sky-chart');
      if (!canvas || !astro) return;
      this.lastSkyData = astro;
      this.lastIssData = iss;

      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(cx, cy) - 24;
      const night = document.body.classList.contains('night-vision');

      const colors = night
        ? {
            bg: '#120000', ring: '#550000', grid: '#3a0000', cardinal: '#ff8080',
            label: '#ff6060', outline: '#2a0000'
          }
        : {
            bg: '#07101e', ring: '#3a4a68', grid: '#1e2a3e', cardinal: '#9ab4d6',
            label: '#cfd8e6', outline: '#0c1728'
          };

      ctx.clearRect(0, 0, w, h);

      // Horizon disk.
      ctx.fillStyle = colors.bg;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Altitude rings at 30° and 60° (dashed).
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      for (const alt of [30, 60]) {
        const r = radius * (1 - alt / 90);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Cardinal cross.
      ctx.save();
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
      ctx.stroke();
      ctx.restore();

      // Horizon ring.
      ctx.strokeStyle = colors.ring;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Cardinal labels (N top, E right, S bottom, W left).
      ctx.fillStyle = colors.cardinal;
      ctx.font = 'bold 13px -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', cx, cy - radius - 12);
      ctx.fillText('S', cx, cy + radius + 12);
      ctx.fillText('E', cx + radius + 12, cy);
      ctx.fillText('W', cx - radius - 12, cy);

      // Altitude/azimuth → canvas coordinates.
      // Azimuth measured from N (=0), increasing clockwise through E (=90).
      // N at top, E at right, S at bottom, W at left.
      const project = (altitudeDeg, azimuthDeg) => {
        const r = radius * (1 - Math.max(0, altitudeDeg) / 90);
        const theta = (azimuthDeg - 90) * Math.PI / 180;
        return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
      };

      const baseBodies = [
        { name: 'Sun', color: '#ffd23a', radius: 7, data: astro.sun },
        { name: 'Moon', color: '#e6e6e6', radius: 6, data: astro.moon },
        ...astro.planets.map(p => ({
          name: p.name,
          color: PLANET_COLORS[p.name] || '#cccccc',
          radius: 5,
          data: p
        }))
      ];

      // Add ISS if we have a live observer-relative fix above the horizon.
      if (iss && iss.current && typeof iss.current.observerAltitude === 'number') {
        baseBodies.push({
          name: 'ISS',
          color: '#5ad2ff',
          radius: 5,
          data: {
            altitude: iss.current.observerAltitude,
            azimuth: iss.current.observerAzimuth
          }
        });
      }

      const tintForNight = (hex) => {
        if (!night) return hex;
        // Map any planet color to a red-tone equivalent preserving brightness.
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const red = Math.min(255, 80 + lum);
        return `rgb(${red}, ${Math.round(red * 0.12)}, ${Math.round(red * 0.12)})`;
      };

      ctx.font = '11px -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      // First pass: draw dots and collect label placements.
      const placements = [];
      for (const body of baseBodies) {
        const d = body.data;
        if (!d || typeof d.altitude !== 'number' || typeof d.azimuth !== 'number') continue;
        const aboveHorizon = d.altitude > 0;
        const altForPlot = aboveHorizon ? d.altitude : 0;
        const { x, y } = project(altForPlot, d.azimuth);
        const color = tintForNight(body.color);

        ctx.save();
        ctx.globalAlpha = aboveHorizon ? 1 : 0.35;
        ctx.fillStyle = color;
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, body.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (body.name === 'Moon' && typeof astro.moon.phaseAngle === 'number') {
          const phase = astro.moon.phaseAngle;
          const lit = 1 - Math.abs(((phase + 180) % 360) - 180) / 180;
          ctx.fillStyle = night ? 'rgba(60, 0, 0, 0.85)' : 'rgba(20, 24, 40, 0.85)';
          ctx.beginPath();
          const coverWidth = body.radius * (1 - lit) * 1.6;
          ctx.ellipse(x, y, coverWidth / 2, body.radius, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        placements.push({
          name: body.name,
          dotX: x,
          dotY: y,
          dotRadius: body.radius,
          labelX: x + body.radius + 4,
          labelY: y,
          aboveHorizon
        });
      }

      // Label collision avoidance: for each label whose target position is
      // within ~40px horizontally and ~14px vertically of another already
      // placed label, nudge it vertically outward (away from the chart
      // center) in 14px increments until clear.
      const placed = [];
      const LABEL_LINE_HEIGHT = 14;
      const X_PROXIMITY = 40;
      const Y_PROXIMITY = 14;
      for (const p of placements) {
        const outwardSign = p.labelY >= cy ? 1 : -1; // push further from center
        let labelY = p.labelY;
        let safety = 10;
        while (safety-- > 0) {
          const collides = placed.some(q =>
            Math.abs(q.labelX - p.labelX) < X_PROXIMITY &&
            Math.abs(q.labelY - labelY) < Y_PROXIMITY
          );
          if (!collides) break;
          labelY += outwardSign * LABEL_LINE_HEIGHT;
        }
        p.labelY = labelY;
        placed.push(p);
      }

      // Second pass: leader lines then labels.
      for (const p of placed) {
        ctx.save();
        ctx.globalAlpha = p.aboveHorizon ? 0.85 : 0.35;

        if (Math.abs(p.labelY - p.dotY) > 2) {
          ctx.strokeStyle = colors.grid;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.dotX + p.dotRadius, p.dotY);
          ctx.lineTo(p.labelX - 2, p.labelY);
          ctx.stroke();
        }

        ctx.fillStyle = colors.label;
        ctx.fillText(p.name, p.labelX, p.labelY);
        ctx.restore();
      }
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

      container.innerHTML = '<div class="loading-spinner">Computing object distances...</div>';

      const AU_TO_KM = 149597870.7;

      const solarSystem = [
        { name: 'Sun', type: 'Star', diameter: 1391400, icon: '☀️', trackable: true },
        { name: 'Mercury', type: 'Planet', diameter: 4879, icon: '🪐', trackable: true },
        { name: 'Venus', type: 'Planet', diameter: 12104, icon: '🪐', trackable: true },
        { name: 'Earth', type: 'Planet', diameter: 12756, icon: '🌍', trackable: false },
        { name: 'Moon', type: 'Satellite', diameter: 3475, icon: '🌙', trackable: true },
        { name: 'Mars', type: 'Planet', diameter: 6792, icon: '🔴', trackable: true },
        { name: 'Jupiter', type: 'Planet', diameter: 142984, icon: '🪐', trackable: true },
        { name: 'Saturn', type: 'Planet', diameter: 120536, icon: '🪐', trackable: true },
        // Uranus/Neptune not in the compute payload — fall back to mean distance.
        { name: 'Uranus', type: 'Planet', diameter: 51118, icon: '🪐', fallbackKm: 2873000000, trackable: false },
        { name: 'Neptune', type: 'Planet', diameter: 49528, icon: '🪐', fallbackKm: 4495000000, trackable: false }
      ];

      // Fetch live distances via astronomy-compute. Location only matters for
      // the topocentric correction, which at these distances is negligible.
      let astro = null;
      try {
        const loc = await this.getLocation();
        const result = await window.astronomer.astronomy.compute(
          { latitude: loc.latitude, longitude: loc.longitude },
          new Date()
        );
        if (result?.data) astro = result.data;
      } catch (e) {
        console.error('Failed to fetch live object distances:', e);
      }

      const distanceFor = (obj) => {
        if (!astro) return obj.fallbackKm != null ? obj.fallbackKm : null;
        if (obj.name === 'Sun') return astro.sun.distanceAu * AU_TO_KM;
        if (obj.name === 'Moon') return astro.moon.distanceAu * AU_TO_KM;
        if (obj.name === 'Earth') return 0;
        const p = astro.planets.find(pl => pl.name === obj.name);
        if (p) return p.distanceAu * AU_TO_KM;
        return obj.fallbackKm != null ? obj.fallbackKm : null;
      };

      const exoplanets = [
        { name: 'Proxima Centauri b', host: 'Proxima Centauri', lightYears: 4.24, discovered: 2016,
          note: 'Closest known exoplanet; rocky, in the habitable zone of our nearest stellar neighbor.' },
        { name: 'TRAPPIST-1e', host: 'TRAPPIST-1', lightYears: 40.7, discovered: 2017,
          note: 'One of seven Earth-sized worlds around an ultra-cool red dwarf; prime habitability candidate.' },
        { name: 'Kepler-452b', host: 'Kepler-452', lightYears: 1402, discovered: 2015,
          note: 'Sometimes called "Earth\'s cousin" — a super-Earth in a Sun-like star\'s habitable zone.' },
        { name: '55 Cancri e', host: '55 Cancri A', lightYears: 41, discovered: 2004,
          note: 'Super-Earth so close to its star that its surface may be a global magma ocean.' },
        { name: 'WASP-12b', host: 'WASP-12', lightYears: 1411, discovered: 2008,
          note: 'Ultra-hot Jupiter being slowly devoured by its star; daytime surface ~2500 K.' },
        { name: 'HD 189733 b', host: 'HD 189733 A', lightYears: 64.5, discovered: 2005,
          note: 'Deep cobalt-blue gas giant where molten-glass rain blows sideways in 8,700 km/h winds.' },
        { name: 'Kepler-22b', host: 'Kepler-22', lightYears: 635, discovered: 2011,
          note: 'First exoplanet found in the habitable zone of a Sun-like star by the Kepler mission.' },
        { name: 'GJ 1214 b', host: 'GJ 1214', lightYears: 47.5, discovered: 2009,
          note: 'Warm sub-Neptune "water world" — JWST spectra suggest a thick, hazy atmosphere.' },
        { name: 'LHS 1140 b', host: 'LHS 1140', lightYears: 48.9, discovered: 2017,
          note: 'Dense super-Earth in the habitable zone of a quiet red dwarf; strong candidate for biosignature searches.' },
        { name: 'TOI-700 d', host: 'TOI-700', lightYears: 101.4, discovered: 2020,
          note: 'First Earth-size habitable-zone planet TESS found, orbiting a cool M-dwarf.' }
      ];

      const solarCards = solarSystem.map(obj => {
        const isFavorited = this.favorites.some(f => f.id === obj.name);
        const km = distanceFor(obj);
        const distLine = km == null
          ? '<p>Distance: —</p>'
          : (obj.name === 'Earth'
              ? '<p>You are here 🙂</p>'
              : `<p>Current distance from Earth: ${this.formatDistance(Math.round(km))}</p>`);
        const trackBtn = obj.trackable
          ? `<button class="btn btn-secondary track-btn" data-action="track-tonight" data-body="${this.attr(obj.name)}">Track Tonight</button>`
          : '';
        const favArg = { name: obj.name, type: obj.type, diameter: obj.diameter, icon: obj.icon, distanceKm: km };
        return `
          <div class="object-card" id="object-card-${obj.name}">
            <div class="object-icon" style="font-size: 48px;">${obj.icon}</div>
            <div class="object-card-body">
              <h3>${obj.name}</h3>
              <p class="object-type">${obj.type}</p>
              ${distLine}
              <p>Diameter: ${obj.diameter.toLocaleString()} km</p>
              <div class="object-card-actions">
                ${trackBtn}
                <button class="favorite-button ${isFavorited ? 'favorited' : ''}"
                        data-action="toggle-favorite" data-fav-type="object" data-fav-id="${this.attr(obj.name)}"
                        data-payload="${this.payloadAttr(favArg)}">
                  ${isFavorited ? '★ Favorited' : '☆ Favorite'}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      const exoCards = exoplanets.map(p => {
        const id = `exo-${p.name.replace(/[^a-z0-9]+/gi, '-')}`;
        const isFavorited = this.favorites.some(f => f.id === id);
        const favArg = { id, name: p.name, host: p.host, lightYears: p.lightYears, discovered: p.discovered, note: p.note, icon: '🪐' };
        return `
          <div class="object-card exoplanet-card">
            <div class="object-icon" style="font-size: 44px;">🪐</div>
            <div class="object-card-body">
              <h3>${p.name}</h3>
              <p class="object-type">Exoplanet · ${p.host}</p>
              <p>${p.lightYears.toLocaleString()} light-years away</p>
              <p>Discovered ${p.discovered}</p>
              <p class="exo-note">${p.note}</p>
              <button class="favorite-button ${isFavorited ? 'favorited' : ''}"
                      data-action="toggle-favorite" data-fav-type="object" data-fav-id="${this.attr(id)}"
                      data-payload="${this.payloadAttr(favArg)}">
                ${isFavorited ? '★ Favorited' : '☆ Favorite'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <h2>Solar System</h2>
        <p class="section-subtitle">Distances computed live from the observer's location.</p>
        <div class="objects-cards">${solarCards}</div>

        <h2 class="exoplanets-heading">Notable Exoplanets</h2>
        <p class="section-subtitle">A sampler of worlds beyond our Solar System.</p>
        <div class="objects-cards">${exoCards}</div>
      `;
    }

    async trackTonight(bodyName) {
      await this.showTab('observe');
      // Wait one frame so the observation data renders, then scroll the matching
      // planet card into view and briefly highlight it.
      requestAnimationFrame(() => {
        setTimeout(() => {
          const section = Array.from(document.querySelectorAll('#observation-data .obs-section'))
            .find(s => s.querySelector('h3')?.textContent === bodyName)
            || Array.from(document.querySelectorAll('#observation-data .planet-list li'))
              .find(li => li.querySelector('strong')?.textContent === bodyName);
          if (!section) return;
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
          section.classList.add('track-highlight');
          setTimeout(() => section.classList.remove('track-highlight'), 2000);
        }, 200);
      });
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
                      data-action="remove-favorite" data-fav-id="${this.attr(fav.id)}">
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