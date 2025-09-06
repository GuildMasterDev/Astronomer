export class ObserveView {
  constructor() {
    this.dataContainer = null;
    this.location = null;
    this.initialized = false;
  }

  async activate() {
    if (!this.initialized) {
      this.init();
      this.initialized = true;
    }
    await this.loadDefaultLocation();
    await this.calculateObservationData();
  }

  init() {
    this.dataContainer = document.getElementById('observation-data');

    // Location controls
    document.getElementById('use-location')?.addEventListener('click', () => {
      this.getUserLocation();
    });

    // Manual location input
    ['latitude', 'longitude', 'location-name'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        this.updateLocation();
      });
    });
  }

  async loadDefaultLocation() {
    const settings = await window.astronomer.store.get('settings');
    if (settings?.location) {
      this.location = settings.location;
      this.updateLocationInputs();
    } else {
      // Default to Denver, CO
      this.location = {
        latitude: 39.7392,
        longitude: -104.9903,
        timezone: 'America/Denver',
        name: 'Denver, CO'
      };
      this.updateLocationInputs();
    }
  }

  updateLocationInputs() {
    if (this.location) {
      const latInput = document.getElementById('latitude');
      const lonInput = document.getElementById('longitude');
      const nameInput = document.getElementById('location-name');
      
      if (latInput) latInput.value = this.location.latitude;
      if (lonInput) lonInput.value = this.location.longitude;
      if (nameInput) nameInput.value = this.location.name || '';
    }
  }

  async getUserLocation() {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        
        this.location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          name: 'Current Location'
        };
        
        this.updateLocationInputs();
        await this.calculateObservationData();
      } catch (error) {
        this.showError('Unable to get your location: ' + error.message);
      }
    } else {
      this.showError('Geolocation is not supported by your browser');
    }
  }

  updateLocation() {
    const lat = parseFloat(document.getElementById('latitude')?.value);
    const lon = parseFloat(document.getElementById('longitude')?.value);
    const name = document.getElementById('location-name')?.value || 'Custom Location';

    if (!isNaN(lat) && !isNaN(lon)) {
      this.location = {
        latitude: lat,
        longitude: lon,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        name: name
      };
      this.calculateObservationData();
    }
  }

  async calculateObservationData() {
    if (!this.location || !this.dataContainer) return;

    this.showLoading();

    try {
      const now = new Date();
      const data = {
        location: this.location,
        time: now,
        twilight: this.calculateTwilight(now),
        moon: await this.calculateMoonData(now),
        sun: this.calculateSunData(now),
        planets: this.calculatePlanetsVisibility(now),
        iss: await this.getISSPasses()
      };

      this.displayObservationData(data);
    } catch (error) {
      this.showError('Failed to calculate observation data: ' + error.message);
    }
  }

  calculateTwilight(date) {
    // Simplified twilight calculation
    const lat = this.location.latitude;
    const lon = this.location.longitude;
    
    // This is a placeholder - in production, use astronomy-engine
    const sunset = new Date(date);
    sunset.setHours(19, 30, 0); // Placeholder time
    
    const civilTwilight = new Date(sunset);
    civilTwilight.setMinutes(sunset.getMinutes() + 30);
    
    const nauticalTwilight = new Date(civilTwilight);
    nauticalTwilight.setMinutes(civilTwilight.getMinutes() + 30);
    
    const astronomicalTwilight = new Date(nauticalTwilight);
    astronomicalTwilight.setMinutes(nauticalTwilight.getMinutes() + 30);

    return {
      sunset: sunset.toLocaleTimeString(),
      civil: civilTwilight.toLocaleTimeString(),
      nautical: nauticalTwilight.toLocaleTimeString(),
      astronomical: astronomicalTwilight.toLocaleTimeString()
    };
  }

  async calculateMoonData(date) {
    // Simplified moon phase calculation
    const lunationNumber = 0.0;
    const phase = ((date.getTime() / 1000 - 947182440) / 2551442.8) % 1;
    
    let phaseName = 'New Moon';
    const illumination = Math.abs(Math.sin(phase * Math.PI)) * 100;
    
    if (phase < 0.125) phaseName = 'New Moon';
    else if (phase < 0.25) phaseName = 'Waxing Crescent';
    else if (phase < 0.375) phaseName = 'First Quarter';
    else if (phase < 0.5) phaseName = 'Waxing Gibbous';
    else if (phase < 0.625) phaseName = 'Full Moon';
    else if (phase < 0.75) phaseName = 'Waning Gibbous';
    else if (phase < 0.875) phaseName = 'Last Quarter';
    else phaseName = 'Waning Crescent';

    return {
      phase: phaseName,
      illumination: illumination.toFixed(1),
      rise: '20:45', // Placeholder
      set: '08:30'   // Placeholder
    };
  }

  calculateSunData(date) {
    // Simplified sun data
    return {
      rise: '06:30', // Placeholder
      set: '19:30',  // Placeholder
      altitude: 45   // Placeholder noon altitude
    };
  }

  calculatePlanetsVisibility(date) {
    // Simplified planet visibility
    const planets = [
      { name: 'Mercury', visible: false, rise: 'N/A', set: 'N/A' },
      { name: 'Venus', visible: true, rise: '05:00', set: '17:30' },
      { name: 'Mars', visible: true, rise: '22:00', set: '10:00' },
      { name: 'Jupiter', visible: true, rise: '20:00', set: '06:00' },
      { name: 'Saturn', visible: true, rise: '18:00', set: '04:00' }
    ];
    
    return planets;
  }

  async getISSPasses() {
    try {
      const position = await window.astronomer.api.fetch('iss-position', {});
      
      // Calculate simple visibility (this is simplified)
      const passes = [{
        time: '21:45',
        duration: '4 min',
        maxElevation: '65°',
        direction: 'SW to NE'
      }];
      
      return {
        currentPosition: position,
        nextPasses: passes
      };
    } catch (error) {
      console.error('Failed to get ISS data:', error);
      return null;
    }
  }

  displayObservationData(data) {
    if (!this.dataContainer) return;

    const content = `
      <div class="observation-sections">
        <section class="obs-section">
          <h3>Location: ${data.location.name}</h3>
          <p>Coordinates: ${data.location.latitude.toFixed(4)}°, ${data.location.longitude.toFixed(4)}°</p>
          <p>Current Time: ${data.time.toLocaleString()}</p>
        </section>

        <section class="obs-section">
          <h3>Twilight Times</h3>
          <div class="twilight-times">
            <div class="time-item">
              <span class="time-label">Sunset:</span>
              <span class="time-value">${data.twilight.sunset}</span>
            </div>
            <div class="time-item">
              <span class="time-label">Civil Twilight:</span>
              <span class="time-value">${data.twilight.civil}</span>
            </div>
            <div class="time-item">
              <span class="time-label">Nautical Twilight:</span>
              <span class="time-value">${data.twilight.nautical}</span>
            </div>
            <div class="time-item">
              <span class="time-label">Astronomical Twilight:</span>
              <span class="time-value">${data.twilight.astronomical}</span>
            </div>
          </div>
        </section>

        <section class="obs-section">
          <h3>Moon</h3>
          <div class="moon-data">
            <p>Phase: ${data.moon.phase}</p>
            <p>Illumination: ${data.moon.illumination}%</p>
            <p>Rise: ${data.moon.rise} | Set: ${data.moon.set}</p>
          </div>
        </section>

        <section class="obs-section">
          <h3>Sun</h3>
          <div class="sun-data">
            <p>Rise: ${data.sun.rise} | Set: ${data.sun.set}</p>
            <p>Max Altitude: ${data.sun.altitude}°</p>
          </div>
        </section>

        <section class="obs-section">
          <h3>Visible Planets Tonight</h3>
          <div class="planets-list">
            ${data.planets.filter(p => p.visible).map(planet => `
              <div class="planet-item">
                <h4>${planet.name}</h4>
                <p>Rise: ${planet.rise} | Set: ${planet.set}</p>
              </div>
            `).join('')}
          </div>
        </section>

        ${data.iss ? `
          <section class="obs-section">
            <h3>ISS Passes</h3>
            ${data.iss.currentPosition ? `
              <p>Current Position: Lat ${data.iss.currentPosition.latitude.toFixed(2)}°, 
                 Lon ${data.iss.currentPosition.longitude.toFixed(2)}°</p>
            ` : ''}
            ${data.iss.nextPasses && data.iss.nextPasses.length > 0 ? `
              <div class="iss-passes">
                <h4>Next Visible Pass:</h4>
                ${data.iss.nextPasses.map(pass => `
                  <div class="pass-item">
                    <p>Time: ${pass.time}</p>
                    <p>Duration: ${pass.duration}</p>
                    <p>Max Elevation: ${pass.maxElevation}</p>
                    <p>Direction: ${pass.direction}</p>
                  </div>
                `).join('')}
              </div>
            ` : '<p>No visible passes in the next 24 hours</p>'}
          </section>
        ` : ''}
      </div>
    `;

    this.dataContainer.innerHTML = content;
  }

  showLoading() {
    if (this.dataContainer) {
      this.dataContainer.innerHTML = '<div class="loading-spinner">Calculating observation data...</div>';
    }
  }

  showError(message) {
    if (this.dataContainer) {
      this.dataContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }

  async refresh() {
    await this.calculateObservationData();
  }
}