// Simple app initialization without ES modules
(function() {
  'use strict';

  class AstronomerApp {
    constructor() {
      this.currentTab = 'explore';
      this.apodData = null;
    }

    async init() {
      console.log('Initializing Astronomer app...');
      this.setupTabs();
      this.setupTheme();
      this.showTab('explore');
      await this.loadAPOD();
    }

    setupTabs() {
      document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
          const tab = e.currentTarget.getAttribute('data-tab');
          this.showTab(tab);
        });
      });
    }

    showTab(tabName) {
      // Update buttons
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
      });

      // Update content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
      });

      this.currentTab = tabName;
    }

    setupTheme() {
      const themeToggle = document.querySelector('.theme-toggle');
      if (themeToggle) {
        themeToggle.addEventListener('click', () => {
          const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
          const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', newTheme);
        });
      }
    }

    async loadAPOD() {
      const container = document.getElementById('apod-content');
      if (!container) return;

      // Show loading
      container.innerHTML = '<div class="loading-spinner">Loading NASA Picture of the Day...</div>';

      try {
        if (!window.astronomer) {
          throw new Error('API not available. Please restart the app.');
        }

        // Fetch APOD data
        const data = await window.astronomer.api.fetch('apod', {
          api_key: 'DEMO_KEY'
        });

        if (data) {
          this.displayAPOD(data);
        } else {
          throw new Error('No data received from NASA');
        }
      } catch (error) {
        console.error('Failed to load APOD:', error);
        container.innerHTML = `
          <div class="error-message">
            <h3>Failed to load NASA Picture of the Day</h3>
            <p>${error.message}</p>
            <button class="btn btn-primary" onclick="window.astronomerApp.loadAPOD()">Retry</button>
          </div>
        `;
      }
    }

    displayAPOD(data) {
      const container = document.getElementById('apod-content');
      if (!container) return;

      const content = `
        <div class="apod-item">
          ${data.media_type === 'video' ? 
            `<iframe class="apod-video" src="${data.url}" frameborder="0" allowfullscreen></iframe>` :
            `<img class="apod-image" src="${data.url}" alt="${data.title}" />`
          }
          <div class="apod-info">
            <h3 class="apod-title">${data.title}</h3>
            <p class="apod-date">${this.formatDate(data.date)}</p>
            <p class="apod-explanation">${data.explanation}</p>
            ${data.copyright ? `<p class="apod-copyright">© ${data.copyright}</p>` : ''}
          </div>
        </div>
      `;

      container.innerHTML = content;
      this.apodData = data;
      this.setupAPODControls();
    }

    setupAPODControls() {
      // Today button
      const todayBtn = document.getElementById('apod-today');
      if (todayBtn) {
        todayBtn.onclick = () => this.loadAPOD();
      }

      // Random button
      const randomBtn = document.getElementById('apod-random');
      if (randomBtn) {
        randomBtn.onclick = async () => {
          const container = document.getElementById('apod-content');
          container.innerHTML = '<div class="loading-spinner">Loading random picture...</div>';
          
          try {
            const data = await window.astronomer.api.fetch('apod', {
              api_key: 'DEMO_KEY',
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

      // Date picker
      const datePicker = document.getElementById('apod-date');
      if (datePicker) {
        // Set max date to today
        datePicker.max = new Date().toISOString().split('T')[0];
        datePicker.onchange = async (e) => {
          const date = e.target.value;
          if (!date) return;

          const container = document.getElementById('apod-content');
          container.innerHTML = '<div class="loading-spinner">Loading picture for ' + date + '...</div>';
          
          try {
            const data = await window.astronomer.api.fetch('apod', {
              api_key: 'DEMO_KEY',
              date: date
            });
            this.displayAPOD(data);
          } catch (error) {
            console.error('Failed to load APOD for date:', error);
          }
        };
      }
    }

    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating app...');
    const app = new AstronomerApp();
    window.astronomerApp = app;
    app.init().catch(console.error);
  });
})();