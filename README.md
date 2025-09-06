# 🚀 Astronomer

A secure, React-free Electron desktop application for exploring astronomy data and planning observations. Built with vanilla JavaScript, HTML, and CSS.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?logo=electron)
![Platform](https://img.shields.io/badge/Platform-macOS%20|%20Windows%20|%20Linux-lightgrey)

## ✨ Features

### 🌌 Explore
- **NASA APOD**: Browse Astronomy Picture of the Day with date picker and random selection
- **Image & Video Library**: Search NASA's extensive media collection
- **EPIC Earth Images**: View recent natural color images of Earth from space
- **ISS Tracker**: Real-time International Space Station position and pass predictions

### 🎂 Hubble on Your Birthday
- Discover what Hubble saw on your birthday
- Browse through years of Hubble observations
- Smart date matching with ±3 day tolerance

### 🔭 Observe Tonight
- Location-based observation planning (manual or GPS)
- Twilight times (civil, nautical, astronomical)
- Moon phase and illumination calculations
- Planet visibility predictions
- ISS pass predictions for your location

### 🪐 Objects
- Solar System object catalog with real-time data
- Notable exoplanet database
- Distance calculations and tracking
- Quick facts and observation windows

### ⭐ Favorites & Sharing
- Save any image, object, or observation
- Export favorites as JSON
- Share functionality with system integration

### ⚙️ Settings
- NASA API key configuration
- Dark/Light theme switching
- Metric/Imperial units
- Location defaults
- Performance modes and caching

## 🔒 Security Features

- **Context Isolation**: Enabled by default
- **Sandbox Mode**: All renderer processes sandboxed
- **CSP Headers**: Strict Content Security Policy
- **API Whitelisting**: Only approved endpoints accessible
- **Rate Limiting**: Built-in request throttling
- **No Remote Code**: No external script execution

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- NASA API Key (optional, uses DEMO_KEY by default)

### Installation

```bash
# Clone the repository
git clone https://github.com/guildmasterdev/Astronomer.git
cd Astronomer

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Get Your NASA API Key

1. Visit [https://api.nasa.gov/](https://api.nasa.gov/)
2. Register for a free API key
3. Add to Settings or `.env` file

## 📦 Building

```bash
# Build for production
npm run build

# Package for current platform
npm run package

# Build for specific platforms
npm run package:mac     # macOS
npm run package:win     # Windows
npm run package:linux   # Linux
```

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `1-6` | Switch tabs (Explore, Birthday, Observe, Objects, Favorites, Settings) |
| `Cmd/Ctrl+F` | Focus search |
| `Cmd/Ctrl+K` | Quick actions |
| `R` | Refresh current view |
| `Cmd/Ctrl+E` | Export favorites |
| `Esc` | Close modal |

## 🏗️ Architecture

```
Astronomer/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # App entry point
│   │   ├── menu.ts     # Application menu
│   │   ├── store.ts    # Persistent storage
│   │   ├── ipc.ts      # IPC handlers
│   │   ├── endpoints.ts # API configuration
│   │   └── rate-limiter.ts # Request throttling
│   ├── preload/        # Secure bridge
│   │   └── preload-simple.js # Context bridge API
│   └── renderer/       # UI (vanilla JS)
│       ├── index.html  # Main window
│       ├── styles.css  # Global styles
│       └── app-complete.js # App logic
├── dist/               # Compiled output
└── build/              # Packaged applications
```

## 🔧 Development

### Commands

```bash
npm run dev       # Start development server
npm test          # Run unit tests
npm run lint      # Lint code
npm run typecheck # Type checking
```

### API Endpoints

The app uses these NASA and astronomy APIs:
- NASA APOD API
- NASA Image and Video Library
- NASA EPIC API
- JPL Horizons API
- ISS Location API
- NASA Exoplanet Archive

## 🔐 Privacy & Security

- **No tracking**: Zero telemetry by default
- **Local storage**: All data stored locally
- **No accounts**: No user accounts or cloud sync
- **Secure APIs**: All external calls go through validated whitelist
- **Open source**: Full code transparency

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Credits

- NASA APIs for providing amazing space data
- Astronomy Engine for celestial calculations
- Electron team for the framework
- All contributors and testers

## 🐛 Known Issues & Recent Fixes

### Fixed
- ✅ HTTP 429 rate limiting now handled with exponential backoff
- ✅ Geolocation permissions properly configured
- ✅ Module loading issues resolved

### Known Issues
- Moon rise/set calculations are simplified placeholders
- Planet visibility uses basic approximations
- ISS pass predictions need refinement

## 📮 Support

- Report issues: [GitHub Issues](https://github.com/guildmasterdev/Astronomer/issues)
- Documentation: [Wiki](https://github.com/guildmasterdev/Astronomer/wiki)

---

Built with ❤️ for space enthusiasts everywhere