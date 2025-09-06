import { formatDate, truncateText } from '../utils/format.js';

export class ExploreView {
  constructor() {
    this.apodContent = null;
    this.nasaImagesGrid = null;
    this.epicImages = null;
    this.initialized = false;
  }

  async activate() {
    if (!this.initialized) {
      this.init();
      this.initialized = true;
    }
    await this.loadTodayAPOD();
  }

  init() {
    this.apodContent = document.getElementById('apod-content');
    this.nasaImagesGrid = document.getElementById('nasa-images-grid');
    this.epicImages = document.getElementById('epic-images');

    // APOD controls
    document.getElementById('apod-today')?.addEventListener('click', () => {
      this.loadTodayAPOD();
    });

    document.getElementById('apod-random')?.addEventListener('click', () => {
      this.loadRandomAPOD();
    });

    document.getElementById('apod-date')?.addEventListener('change', (e) => {
      this.loadAPODByDate(e.target.value);
    });

    // NASA Images search
    document.getElementById('nasa-search-btn')?.addEventListener('click', () => {
      this.searchNASAImages();
    });

    document.getElementById('nasa-search')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchNASAImages();
      }
    });

    // EPIC controls
    document.getElementById('epic-fetch')?.addEventListener('click', () => {
      this.loadEPICImages();
    });
  }

  async loadTodayAPOD() {
    this.showLoading(this.apodContent);
    try {
      const apiKey = await this.getAPIKey();
      const data = await window.astronomer.api.fetch('apod', { api_key: apiKey });
      this.displayAPOD(data);
    } catch (error) {
      this.showError(this.apodContent, 'Failed to load APOD: ' + error.message);
    }
  }

  async loadRandomAPOD() {
    this.showLoading(this.apodContent);
    try {
      const apiKey = await this.getAPIKey();
      const data = await window.astronomer.api.fetch('apod', { 
        api_key: apiKey,
        count: 1 
      });
      if (Array.isArray(data) && data.length > 0) {
        this.displayAPOD(data[0]);
      }
    } catch (error) {
      this.showError(this.apodContent, 'Failed to load random APOD: ' + error.message);
    }
  }

  async loadAPODByDate(date) {
    if (!date) return;
    this.showLoading(this.apodContent);
    try {
      const apiKey = await this.getAPIKey();
      const data = await window.astronomer.api.fetch('apod', { 
        api_key: apiKey,
        date: date 
      });
      this.displayAPOD(data);
    } catch (error) {
      this.showError(this.apodContent, 'Failed to load APOD: ' + error.message);
    }
  }

  displayAPOD(data) {
    if (!data || !this.apodContent) return;

    const content = `
      <div class="apod-item">
        ${data.media_type === 'video' ? 
          `<iframe class="apod-video" src="${data.url}" frameborder="0" allowfullscreen></iframe>` :
          `<img class="apod-image" src="${data.url}" alt="${data.title}" />`
        }
        <div class="apod-info">
          <h3 class="apod-title">${data.title}</h3>
          <p class="apod-date">${formatDate(data.date)}</p>
          <p class="apod-explanation">${data.explanation}</p>
          ${data.copyright ? `<p class="apod-copyright">© ${data.copyright}</p>` : ''}
        </div>
        <button class="favorite-button" data-type="apod" data-id="${data.date}" data-content='${JSON.stringify(data).replace(/'/g, '&apos;')}'>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </button>
      </div>
    `;

    this.apodContent.innerHTML = content;
    this.attachFavoriteHandlers();
  }

  async searchNASAImages() {
    const query = document.getElementById('nasa-search')?.value;
    const mediaType = document.getElementById('nasa-media-type')?.value;

    if (!query) return;

    this.showLoading(this.nasaImagesGrid);
    try {
      const params = { q: query };
      if (mediaType) params.media_type = mediaType;
      
      const data = await window.astronomer.api.fetch('nasa-images', params);
      this.displayNASAImages(data);
    } catch (error) {
      this.showError(this.nasaImagesGrid, 'Failed to search images: ' + error.message);
    }
  }

  displayNASAImages(data) {
    if (!data || !data.collection || !this.nasaImagesGrid) return;

    const items = data.collection.items || [];
    if (items.length === 0) {
      this.nasaImagesGrid.innerHTML = '<p>No images found</p>';
      return;
    }

    const cards = items.slice(0, 12).map(item => {
      const imageData = item.data[0];
      const imageUrl = item.links?.[0]?.href || '';
      
      return `
        <div class="image-card">
          <img src="${imageUrl}" alt="${imageData.title}" />
          <div class="image-card-body">
            <h4 class="image-card-title">${imageData.title}</h4>
            <p class="image-card-description">${truncateText(imageData.description || '', 100)}</p>
          </div>
          <button class="favorite-button" data-type="image" data-id="${imageData.nasa_id}" data-content='${JSON.stringify(item).replace(/'/g, '&apos;')}'>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');

    this.nasaImagesGrid.innerHTML = cards;
    this.attachFavoriteHandlers();
  }

  async loadEPICImages() {
    const date = document.getElementById('epic-date')?.value;
    this.showLoading(this.epicImages);
    
    try {
      const apiKey = await this.getAPIKey();
      const params = { api_key: apiKey };
      if (date) params.date = date;
      
      const data = await window.astronomer.api.fetch('epic', params);
      this.displayEPICImages(data);
    } catch (error) {
      this.showError(this.epicImages, 'Failed to load EPIC images: ' + error.message);
    }
  }

  displayEPICImages(data) {
    if (!data || !this.epicImages) return;

    const images = Array.isArray(data) ? data : [];
    if (images.length === 0) {
      this.epicImages.innerHTML = '<p>No EPIC images available for this date</p>';
      return;
    }

    const cards = images.slice(0, 6).map(img => {
      const date = img.date.split(' ')[0].replace(/-/g, '/');
      const imageUrl = `https://epic.gsfc.nasa.gov/archive/natural/${date}/png/${img.image}.png`;
      
      return `
        <div class="image-card">
          <img src="${imageUrl}" alt="Earth from EPIC" />
          <div class="image-card-body">
            <h4 class="image-card-title">Earth on ${formatDate(img.date)}</h4>
            <p class="image-card-description">Lat: ${img.centroid_coordinates.lat.toFixed(2)}, Lon: ${img.centroid_coordinates.lon.toFixed(2)}</p>
          </div>
        </div>
      `;
    }).join('');

    this.epicImages.innerHTML = cards;
  }

  attachFavoriteHandlers() {
    document.querySelectorAll('.favorite-button').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const button = e.currentTarget;
        const type = button.dataset.type;
        const id = button.dataset.id;
        const content = JSON.parse(button.dataset.content.replace(/&apos;/g, "'"));
        
        if (button.classList.contains('favorited')) {
          await window.astronomer.favorites.remove(id);
          button.classList.remove('favorited');
        } else {
          await window.astronomer.favorites.add({
            id,
            type,
            data: content,
            timestamp: Date.now()
          });
          button.classList.add('favorited');
        }
      });
    });
  }

  async getAPIKey() {
    const settings = await window.astronomer.store.get('apiKeys');
    return settings?.nasa || 'DEMO_KEY';
  }

  showLoading(container) {
    if (container) {
      container.innerHTML = '<div class="loading-spinner">Loading...</div>';
    }
  }

  showError(container, message) {
    if (container) {
      container.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }

  async refresh() {
    await this.loadTodayAPOD();
  }
}