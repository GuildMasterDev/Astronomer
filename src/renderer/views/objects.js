import { formatDistance } from '../utils/format.js';

export class ObjectsView {
  constructor() {
    this.gridContainer = null;
    this.initialized = false;
  }

  async activate() {
    if (!this.initialized) {
      this.init();
      this.initialized = true;
    }
    await this.loadObjects();
  }

  init() {
    this.gridContainer = document.getElementById('objects-grid');
  }

  async loadObjects() {
    this.showLoading();

    try {
      // Load solar system objects and exoplanets
      const [solarSystem, exoplanets] = await Promise.all([
        this.getSolarSystemObjects(),
        this.getExoplanets()
      ]);

      this.displayObjects(solarSystem, exoplanets);
    } catch (error) {
      this.showError('Failed to load objects: ' + error.message);
    }
  }

  async getSolarSystemObjects() {
    // Static data for solar system objects
    return [
      {
        name: 'Sun',
        type: 'Star',
        distance: 149597870.7,
        diameter: 1391400,
        description: 'The star at the center of our Solar System',
        icon: '☀️'
      },
      {
        name: 'Mercury',
        type: 'Planet',
        distance: 77300000,
        diameter: 4879,
        description: 'The smallest and innermost planet',
        icon: '🪐'
      },
      {
        name: 'Venus',
        type: 'Planet',
        distance: 108200000,
        diameter: 12104,
        description: 'The second planet from the Sun',
        icon: '🪐'
      },
      {
        name: 'Earth',
        type: 'Planet',
        distance: 149597870.7,
        diameter: 12756,
        description: 'Our home planet',
        icon: '🌍'
      },
      {
        name: 'Moon',
        type: 'Natural Satellite',
        distance: 384400,
        diameter: 3475,
        description: "Earth's only natural satellite",
        icon: '🌙'
      },
      {
        name: 'Mars',
        type: 'Planet',
        distance: 227900000,
        diameter: 6792,
        description: 'The Red Planet',
        icon: '🔴'
      },
      {
        name: 'Jupiter',
        type: 'Planet',
        distance: 778500000,
        diameter: 142984,
        description: 'The largest planet in our Solar System',
        icon: '🪐'
      },
      {
        name: 'Saturn',
        type: 'Planet',
        distance: 1434000000,
        diameter: 120536,
        description: 'Known for its prominent ring system',
        icon: '🪐'
      },
      {
        name: 'Uranus',
        type: 'Planet',
        distance: 2873000000,
        diameter: 51118,
        description: 'The tilted ice giant',
        icon: '🪐'
      },
      {
        name: 'Neptune',
        type: 'Planet',
        distance: 4495000000,
        diameter: 49528,
        description: 'The windiest planet',
        icon: '🪐'
      },
      {
        name: 'Pluto',
        type: 'Dwarf Planet',
        distance: 5906000000,
        diameter: 2370,
        description: 'The most famous dwarf planet',
        icon: '🪐'
      }
    ];
  }

  async getExoplanets() {
    // For now, return static data for famous exoplanets
    // In production, query the NASA Exoplanet Archive
    return [
      {
        name: 'Proxima Centauri b',
        type: 'Exoplanet',
        distance: 4.24,
        distanceUnit: 'light-years',
        discoveryYear: 2016,
        description: 'The nearest known exoplanet to Earth',
        hostStar: 'Proxima Centauri'
      },
      {
        name: 'TRAPPIST-1e',
        type: 'Exoplanet',
        distance: 39.5,
        distanceUnit: 'light-years',
        discoveryYear: 2017,
        description: 'Part of a system with 7 Earth-sized planets',
        hostStar: 'TRAPPIST-1'
      },
      {
        name: 'Kepler-452b',
        type: 'Exoplanet',
        distance: 1400,
        distanceUnit: 'light-years',
        discoveryYear: 2015,
        description: "Earth's cousin - potentially habitable",
        hostStar: 'Kepler-452'
      },
      {
        name: '55 Cancri e',
        type: 'Exoplanet',
        distance: 41,
        distanceUnit: 'light-years',
        discoveryYear: 2004,
        description: 'A super-Earth that might be covered in diamonds',
        hostStar: '55 Cancri A'
      },
      {
        name: 'WASP-12b',
        type: 'Exoplanet',
        distance: 870,
        distanceUnit: 'light-years',
        discoveryYear: 2008,
        description: 'An ultra-hot Jupiter being consumed by its star',
        hostStar: 'WASP-12'
      }
    ];
  }

  displayObjects(solarSystem, exoplanets) {
    if (!this.gridContainer) return;

    const settings = window.astronomerApp?.themeManager?.getTheme() || 'dark';
    const units = 'metric'; // TODO: Get from settings

    const content = `
      <div class="objects-sections">
        <section class="objects-section">
          <h2>Solar System Objects</h2>
          <div class="objects-cards">
            ${solarSystem.map(obj => `
              <div class="object-card" data-object="${obj.name}">
                <div class="object-icon">${obj.icon || '🪐'}</div>
                <div class="object-card-body">
                  <h3 class="object-card-title">${obj.name}</h3>
                  <p class="object-type">${obj.type}</p>
                  <p class="object-distance">Distance: ${formatDistance(obj.distance, units)}</p>
                  <p class="object-diameter">Diameter: ${obj.diameter.toLocaleString()} km</p>
                  <p class="object-description">${obj.description}</p>
                  <button class="btn btn-secondary track-button" data-object="${obj.name}">
                    Track Tonight
                  </button>
                </div>
                <button class="favorite-button" data-type="object" data-id="${obj.name}" data-content='${JSON.stringify(obj).replace(/'/g, '&apos;')}'>
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                </button>
              </div>
            `).join('')}
          </div>
        </section>

        <section class="objects-section">
          <h2>Notable Exoplanets</h2>
          <div class="exoplanets-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Host Star</th>
                  <th>Distance</th>
                  <th>Discovery</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${exoplanets.map(planet => `
                  <tr>
                    <td><strong>${planet.name}</strong></td>
                    <td>${planet.hostStar}</td>
                    <td>${planet.distance} ${planet.distanceUnit}</td>
                    <td>${planet.discoveryYear}</td>
                    <td>${planet.description}</td>
                    <td>
                      <button class="favorite-button inline" data-type="exoplanet" data-id="${planet.name}" data-content='${JSON.stringify(planet).replace(/'/g, '&apos;')}'>
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="exoplanets-actions">
            <button class="btn btn-secondary" onclick="window.astronomerApp.views.objects.searchMoreExoplanets()">
              Search More Exoplanets
            </button>
          </div>
        </section>
      </div>
    `;

    this.gridContainer.innerHTML = content;
    this.attachEventHandlers();
  }

  attachEventHandlers() {
    // Favorite buttons
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

    // Track tonight buttons
    document.querySelectorAll('.track-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const objectName = e.currentTarget.dataset.object;
        // Navigate to observe tab with this object selected
        window.astronomerApp.router.navigate('observe');
        // TODO: Pass object to observe view
      });
    });

    // Object cards click
    document.querySelectorAll('.object-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          const objectName = card.dataset.object;
          this.showObjectDetails(objectName);
        }
      });
    });
  }

  showObjectDetails(objectName) {
    // TODO: Show detailed modal with object information
    console.log('Show details for:', objectName);
  }

  async searchMoreExoplanets() {
    // TODO: Implement exoplanet search with NASA Exoplanet Archive API
    console.log('Search more exoplanets');
  }

  showLoading() {
    if (this.gridContainer) {
      this.gridContainer.innerHTML = '<div class="loading-spinner">Loading celestial objects...</div>';
    }
  }

  showError(message) {
    if (this.gridContainer) {
      this.gridContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }

  async refresh() {
    await this.loadObjects();
  }
}