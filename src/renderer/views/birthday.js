import { formatDate, truncateText } from '../utils/format.js';

export class BirthdayView {
  constructor() {
    this.resultsContainer = null;
    this.initialized = false;
  }

  async activate() {
    if (!this.initialized) {
      this.init();
      this.initialized = true;
    }
  }

  init() {
    this.resultsContainer = document.getElementById('birthday-results');
    
    // Populate day options when month is selected
    document.getElementById('birthday-month')?.addEventListener('change', (e) => {
      this.populateDays(e.target.value);
    });

    // Search button
    document.getElementById('birthday-search')?.addEventListener('click', () => {
      this.searchBirthdayImages();
    });
  }

  populateDays(month) {
    const daySelect = document.getElementById('birthday-day');
    if (!daySelect) return;

    daySelect.innerHTML = '<option value="">Day</option>';
    
    if (!month) return;

    const daysInMonth = new Date(2024, parseInt(month), 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const option = document.createElement('option');
      option.value = day.toString().padStart(2, '0');
      option.textContent = day.toString();
      daySelect.appendChild(option);
    }
  }

  async searchBirthdayImages() {
    const month = document.getElementById('birthday-month')?.value;
    const day = document.getElementById('birthday-day')?.value;

    if (!month || !day) {
      this.showError('Please select both month and day');
      return;
    }

    this.showLoading();

    try {
      // Search for Hubble images from multiple years
      const currentYear = new Date().getFullYear();
      const searchPromises = [];
      
      for (let year = currentYear; year >= currentYear - 5; year--) {
        const dateString = `${year}-${month}-${day}`;
        searchPromises.push(this.searchHubbleForDate(dateString, year));
      }

      const results = await Promise.all(searchPromises);
      const allImages = results.flat().filter(img => img !== null);
      
      if (allImages.length > 0) {
        this.displayResults(allImages, month, day);
      } else {
        // Try with a wider date range (±3 days)
        await this.searchWithDateRange(month, day);
      }
    } catch (error) {
      this.showError('Failed to search Hubble images: ' + error.message);
    }
  }

  async searchHubbleForDate(dateString, year) {
    try {
      const params = {
        q: 'Hubble',
        media_type: 'image',
        year_start: year.toString(),
        year_end: year.toString()
      };

      const data = await window.astronomer.api.fetch('nasa-images', params);
      
      if (data?.collection?.items) {
        // Filter for items that match the date
        return data.collection.items.filter(item => {
          const itemDate = item.data[0].date_created;
          return itemDate && itemDate.startsWith(dateString);
        }).map(item => ({
          ...item,
          year: year
        }));
      }
    } catch (error) {
      console.error(`Failed to search for year ${year}:`, error);
    }
    return [];
  }

  async searchWithDateRange(month, day) {
    this.showLoading();
    
    try {
      const params = {
        q: 'Hubble telescope',
        media_type: 'image'
      };

      const data = await window.astronomer.api.fetch('nasa-images', params);
      
      if (data?.collection?.items) {
        // Filter for items within ±3 days of the birthday
        const targetMonth = parseInt(month);
        const targetDay = parseInt(day);
        
        const nearbyImages = data.collection.items.filter(item => {
          const itemDate = new Date(item.data[0].date_created);
          const itemMonth = itemDate.getMonth() + 1;
          const itemDay = itemDate.getDate();
          
          const dayDiff = Math.abs(itemDay - targetDay);
          return itemMonth === targetMonth && dayDiff <= 3;
        });

        if (nearbyImages.length > 0) {
          this.displayResults(nearbyImages, month, day, true);
        } else {
          this.showError('No Hubble images found near this date');
        }
      }
    } catch (error) {
      this.showError('Failed to search Hubble images: ' + error.message);
    }
  }

  displayResults(images, month, day, isApproximate = false) {
    if (!this.resultsContainer) return;

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[parseInt(month)];

    const content = `
      <div class="birthday-results-header">
        <h2>Hubble Images from ${monthName} ${parseInt(day)}</h2>
        ${isApproximate ? '<p class="note">Showing images from nearby dates (±3 days)</p>' : ''}
      </div>
      <div class="birthday-carousel">
        ${images.map((item, index) => {
          const imageData = item.data[0];
          const imageUrl = item.links?.[0]?.href || '';
          const date = new Date(imageData.date_created);
          
          return `
            <div class="birthday-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
              <div class="birthday-image-container">
                <img src="${imageUrl}" alt="${imageData.title}" />
                <div class="birthday-year-badge">${item.year || date.getFullYear()}</div>
              </div>
              <div class="birthday-info">
                <h3>${imageData.title}</h3>
                <p class="birthday-date">${formatDate(imageData.date_created)}</p>
                <p class="birthday-description">${truncateText(imageData.description || '', 300)}</p>
                ${imageData.keywords ? 
                  `<div class="birthday-keywords">
                    ${imageData.keywords.slice(0, 5).map(k => `<span class="keyword">${k}</span>`).join('')}
                  </div>` : ''
                }
              </div>
              <button class="favorite-button" data-type="hubble" data-id="${imageData.nasa_id}" data-content='${JSON.stringify(item).replace(/'/g, '&apos;')}'>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
              </button>
            </div>
          `;
        }).join('')}
      </div>
      ${images.length > 1 ? `
        <div class="birthday-navigation">
          <button class="carousel-prev" onclick="window.astronomerApp.views.birthday.previousSlide()">←</button>
          <span class="carousel-indicator">${1} / ${images.length}</span>
          <button class="carousel-next" onclick="window.astronomerApp.views.birthday.nextSlide()">→</button>
        </div>
      ` : ''}
    `;

    this.resultsContainer.innerHTML = content;
    this.currentSlide = 0;
    this.totalSlides = images.length;
    this.attachFavoriteHandlers();
  }

  previousSlide() {
    if (this.currentSlide > 0) {
      this.showSlide(this.currentSlide - 1);
    }
  }

  nextSlide() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.showSlide(this.currentSlide + 1);
    }
  }

  showSlide(index) {
    const slides = document.querySelectorAll('.birthday-slide');
    const indicator = document.querySelector('.carousel-indicator');
    
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    
    this.currentSlide = index;
    if (indicator) {
      indicator.textContent = `${index + 1} / ${this.totalSlides}`;
    }
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

  showLoading() {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = '<div class="loading-spinner">Searching for Hubble images...</div>';
    }
  }

  showError(message) {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }
}