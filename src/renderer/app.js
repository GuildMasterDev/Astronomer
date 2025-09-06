import { Router } from './utils/router.js';
import { ThemeManager } from './utils/theme.js';
import { ExploreView } from './views/explore.js';
import { BirthdayView } from './views/birthday.js';
import { ObserveView } from './views/observe.js';
import { ObjectsView } from './views/objects.js';
import { FavoritesView } from './views/favorites.js';
import { SettingsView } from './views/settings.js';

class AstronomerApp {
  constructor() {
    this.router = new Router();
    this.themeManager = new ThemeManager();
    this.views = {};
    this.currentView = null;
  }

  async init() {
    await this.loadSettings();
    this.initializeViews();
    this.setupEventListeners();
    this.router.navigate('explore');
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Listen for navigation from main process
    if (window.astronomer?.navigation) {
      window.astronomer.navigation.onNavigate((tabName) => {
        this.router.navigate(tabName);
      });
    }
  }

  async loadSettings() {
    if (window.astronomer?.store) {
      const settings = await window.astronomer.store.get('settings');
      if (settings) {
        this.themeManager.setTheme(settings.theme);
        if (settings.reduceMotion) {
          document.body.setAttribute('data-reduce-motion', 'true');
        }
      }
    }
  }

  initializeViews() {
    this.views = {
      explore: new ExploreView(),
      birthday: new BirthdayView(),
      observe: new ObserveView(),
      objects: new ObjectsView(),
      favorites: new FavoritesView(),
      settings: new SettingsView()
    };

    // Initialize router with views
    Object.entries(this.views).forEach(([name, view]) => {
      this.router.addRoute(name, () => this.showView(name));
    });
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.router.navigate(tab);
      });
    });

    // Theme toggle
    document.querySelector('.theme-toggle')?.addEventListener('click', () => {
      this.themeManager.toggle();
      this.saveSettings();
    });

    // Search button
    document.querySelector('.search-button')?.addEventListener('click', () => {
      this.showSearch();
    });

    // Modal close
    document.querySelector('.modal-close')?.addEventListener('click', () => {
      this.closeModal();
    });

    // Click outside modal to close
    document.getElementById('modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal') {
        this.closeModal();
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Tab navigation shortcuts (1-6)
      if (e.key >= '1' && e.key <= '6' && !e.ctrlKey && !e.metaKey) {
        const tabs = ['explore', 'birthday', 'observe', 'objects', 'favorites', 'settings'];
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          this.router.navigate(tabs[index]);
        }
      }

      // Search shortcut (Cmd/Ctrl+F)
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        this.showSearch();
      }

      // Quick actions (Cmd/Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.showQuickActions();
      }

      // Refresh (R)
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.refreshCurrentView();
      }

      // Escape to close modal
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  async showView(viewName) {
    // Deactivate current view
    if (this.currentView && this.views[this.currentView].deactivate) {
      await this.views[this.currentView].deactivate();
    }

    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === viewName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${viewName}-tab`);
    });

    // Activate new view
    this.currentView = viewName;
    if (this.views[viewName].activate) {
      await this.views[viewName].activate();
    }
  }

  showSearch() {
    // Focus on search input in current view if available
    const searchInput = document.querySelector('.tab-content.active .search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  showQuickActions() {
    // TODO: Implement quick actions palette
    console.log('Quick actions not yet implemented');
  }

  async refreshCurrentView() {
    if (this.currentView && this.views[this.currentView].refresh) {
      await this.views[this.currentView].refresh();
    }
  }

  showModal(content) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    if (modal && modalBody) {
      modalBody.innerHTML = content;
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

  async saveSettings() {
    if (window.astronomer?.store) {
      const settings = await window.astronomer.store.get('settings');
      const updatedSettings = {
        ...settings,
        theme: this.themeManager.currentTheme
      };
      await window.astronomer.store.set('settings', updatedSettings);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AstronomerApp();
  app.init().catch(console.error);
  
  // Expose app globally for debugging
  window.astronomerApp = app;
});