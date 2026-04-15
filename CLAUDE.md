# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Compiles TS then launches Electron (via scripts/dev-simple.mjs)
npm run dev:vite   # Alternate Vite-based dev flow (scripts/dev.mjs)
npm run build      # tsc && vite build
npm test           # vitest
npm run test:e2e   # playwright
npm run lint       # eslint . --ext .ts,.js
npm run typecheck  # tsc --noEmit
npm run pack:mac | pack:win | pack:linux   # electron-builder for that platform
```

Run a single vitest: `npx vitest run path/to/file.test.ts -t "test name"`.

Node >=18 required. NASA API key is optional (falls back to `DEMO_KEY`); configured via in-app Settings, not env vars.

## Architecture

Electron app with three isolated processes — **main** (Node/TS), **preload** (context bridge), **renderer** (vanilla JS, no framework). Security posture is strict: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, strict CSP set in `src/main/main.ts`, and `will-navigate` is locked to `file://` and the dev URL.

**All external HTTP goes through the main process.** The renderer never calls `fetch` directly. Flow:

1. Renderer calls `window.astronomer.api.fetch(endpointId, params)` (exposed by `src/preload/preload-simple.js`).
2. Preload `invoke`s `api-fetch` IPC with built-in retry + exponential backoff on `RATE_LIMITED`.
3. `src/main/ipc.ts` looks up the endpoint in `src/main/endpoints.ts` (whitelist of allowed NASA/JPL/ISS URLs), runs it through `src/main/rate-limiter.ts` (serialized queue, 100ms min gap), and uses Electron's `net.request`.
4. Main returns `{ data, error, statusCode }`. 403 is surfaced with an API-key-specific hint; 429 triggers renderer-side backoff (5s → 10s → 20s, capped 30s).

**Adding a new external API** requires three coordinated edits: add to `ENDPOINTS` in `src/main/endpoints.ts`, add the origin to the CSP `connect-src` (and `img-src` if loading images) in `src/main/main.ts`, then call via `astronomer.api.fetch('your-endpoint-id', params)`.

**Persistence** is `electron-store` (`src/main/store.ts`), accessed from the renderer via `window.astronomer.store.{get,set,delete}` and `window.astronomer.favorites.*`. No cloud sync — everything is local.

**The active renderer entry is `src/renderer/app-complete.js`** (referenced by `index.html`). `app.js` and `app-simple.js` are older variants still in the tree; prefer editing `app-complete.js` unless migrating. TypeScript versions of the preload (`preload.ts`, `cache.ts`, `whitelist.ts`) exist but `main.ts` loads the compiled-free `preload-simple.js` directly — edit the `.js` file for preload changes.

**Build output paths matter**: `main.ts` resolves the preload via `path.join(__dirname, '../../src/preload/preload-simple.js')` from `dist/main/`, i.e. it reaches back into `src/`. Don't move the preload file without updating that path and the `electron-builder` `files` glob in `package.json`.

Astronomy calculations (twilight, moon phase, planet visibility) use the `astronomy-engine` package; per the README these are approximations in several places (moon rise/set, ISS passes).
