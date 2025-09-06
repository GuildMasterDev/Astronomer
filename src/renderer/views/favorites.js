import { formatDate, truncateText } from '../utils/format.js';

export class FavoritesView {
  constructor() {
    this.gridContainer = null;
    this.favorites = [];
    this.initialized = false;
  }

  async activate() {
    if (!this.initialized) {
      this.init();
      this.initialized = true;
    }
    await this.loadFavorites();
  }

  init() {
    this.gridContainer = document.getElementById('favorites-grid');

    // Export favorites button
    document.getElementById('export-favorites')?.addEventListener('click', () => {
      this.exportFavorites();
    });

    // Clear favorites button
    document.getElementById('clear-favorites')?.addEventListener('click', () => {
      this.clearFavorites();
    });
  }

  async loadFavorites() {
    try {
      this.favorites = await window.astronomer.favorites.getAll();
      this.displayFavorites();
    } catch (error) {
      this.showError('Failed to load favorites: ' + error.message);
    }
  }

  displayFavorites() {
    if (!this.gridContainer) return;

    if (this.favorites.length === 0) {
      this.gridContainer.innerHTML = `
        <div class="empty-favorites">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="var(--text-secondary)">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
          <h3>No favorites yet</h3>
          <p>Start exploring and click the star icon to save your favorite items</p>
        </div>
      `;
      return;
    }

    const cards = this.favorites.map(fav => {
      switch (fav.type) {
        case 'apod':
          return this.createAPODCard(fav);
        case 'image':
        case 'hubble':
          return this.createImageCard(fav);
        case 'object':
          return this.createObjectCard(fav);
        case 'exoplanet':
          return this.createExoplanetCard(fav);
        default:
          return '';
      }
    }).join('');

    this.gridContainer.innerHTML = cards;
    this.attachEventHandlers();
  }

  createAPODCard(fav) {
    const data = fav.data;
    return `
      <div class="favorite-card apod-favorite" data-id="${fav.id}">
        <div class="favorite-type-badge">APOD</div>
        ${data.media_type === 'video' ? 
          `<div class="favorite-video-placeholder">📹 Video</div>` :
          `<img src="${data.url}" alt="${data.title}" />`
        }
        <div class="favorite-card-body">
          <h4>${data.title}</h4>
          <p class="favorite-date">${formatDate(data.date)}</p>
          <p class="favorite-description">${truncateText(data.explanation, 100)}</p>
        </div>
        <div class="favorite-actions">
          <button class="btn-icon view-btn" data-id="${fav.id}" title="View">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </button>
          <button class="btn-icon share-btn" data-id="${fav.id}" title="Share">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
            </svg>
          </button>
          <button class="btn-icon remove-btn" data-id="${fav.id}" title="Remove">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  createImageCard(fav) {
    const data = fav.data.data?.[0] || fav.data;
    const imageUrl = fav.data.links?.[0]?.href || '';
    
    return `
      <div class="favorite-card image-favorite" data-id="${fav.id}">
        <div class="favorite-type-badge">${fav.type === 'hubble' ? 'Hubble' : 'NASA'}</div>
        <img src="${imageUrl}" alt="${data.title}" />
        <div class="favorite-card-body">
          <h4>${data.title}</h4>
          <p class="favorite-date">${formatDate(data.date_created)}</p>
          <p class="favorite-description">${truncateText(data.description || '', 100)}</p>
        </div>
        <div class="favorite-actions">
          <button class="btn-icon view-btn" data-id="${fav.id}" title="View">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </button>
          <button class="btn-icon share-btn" data-id="${fav.id}" title="Share">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
            </svg>
          </button>
          <button class="btn-icon remove-btn" data-id="${fav.id}" title="Remove">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  createObjectCard(fav) {
    const data = fav.data;
    return `
      <div class="favorite-card object-favorite" data-id="${fav.id}">
        <div class="favorite-type-badge">Solar System</div>
        <div class="object-icon-large">${data.icon || '🪐'}</div>
        <div class="favorite-card-body">
          <h4>${data.name}</h4>
          <p class="favorite-type">${data.type}</p>
          <p class="favorite-description">${data.description}</p>
        </div>
        <div class="favorite-actions">
          <button class="btn-icon track-btn" data-name="${data.name}" title="Track Tonight">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
          <button class="btn-icon remove-btn" data-id="${fav.id}" title="Remove">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  createExoplanetCard(fav) {
    const data = fav.data;
    return `
      <div class="favorite-card exoplanet-favorite" data-id="${fav.id}">
        <div class="favorite-type-badge">Exoplanet</div>
        <div class="object-icon-large">🌍</div>
        <div class="favorite-card-body">
          <h4>${data.name}</h4>
          <p class="favorite-type">Host: ${data.hostStar}</p>
          <p class="favorite-distance">${data.distance} ${data.distanceUnit}</p>
          <p class="favorite-description">${data.description}</p>
        </div>
        <div class="favorite-actions">
          <button class="btn-icon info-btn" data-name="${data.name}" title="More Info">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          </button>
          <button class="btn-icon remove-btn" data-id="${fav.id}" title="Remove">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  attachEventHandlers() {
    // Remove buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        await this.removeFavorite(id);
      });
    });

    // View buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.viewFavorite(id);
      });
    });

    // Share buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.shareFavorite(id);
      });
    });

    // Track buttons
    document.querySelectorAll('.track-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = e.currentTarget.dataset.name;
        window.astronomerApp.router.navigate('observe');
        // TODO: Pass object to observe view
      });
    });
  }

  async removeFavorite(id) {
    if (confirm('Remove this item from favorites?')) {
      await window.astronomer.favorites.remove(id);
      await this.loadFavorites();
    }
  }

  viewFavorite(id) {
    const favorite = this.favorites.find(f => f.id === id);
    if (favorite) {
      // TODO: Show detailed modal
      console.log('View favorite:', favorite);
    }
  }

  async shareFavorite(id) {
    const favorite = this.favorites.find(f => f.id === id);
    if (favorite) {
      const shareData = {
        title: favorite.data.title || favorite.data.name,
        text: favorite.data.description || favorite.data.explanation,
        url: favorite.data.url || ''
      };
      
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          console.log('Share cancelled or failed');
        }
      } else {
        // Fallback: copy to clipboard
        const text = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
      }
    }
  }

  async exportFavorites() {
    try {
      await window.astronomer.favorites.export();
    } catch (error) {
      this.showError('Failed to export favorites: ' + error.message);
    }
  }

  async clearFavorites() {
    if (confirm('Are you sure you want to clear all favorites? This cannot be undone.')) {
      for (const fav of this.favorites) {
        await window.astronomer.favorites.remove(fav.id);
      }
      await this.loadFavorites();
    }
  }

  showError(message) {
    if (this.gridContainer) {
      this.gridContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }

  async refresh() {
    await this.loadFavorites();
  }
}