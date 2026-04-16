#!/usr/bin/env node
// Stages shared renderer assets into src/web/public/ so Vite can serve
// and copy them. Run before `vite build --config vite.config.web.mjs`.

import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const rendererDir = path.join(root, 'src/renderer');
const target = path.join(here, 'public');

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

await cp(path.join(rendererDir, 'public/vendor'), path.join(target, 'vendor'), { recursive: true });
await cp(path.join(rendererDir, 'app-complete.js'), path.join(target, 'app-complete.js'));
await cp(path.join(rendererDir, 'styles.css'), path.join(target, 'styles.css'));

console.log('✓ Staged web assets to src/web/public/');
