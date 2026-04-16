import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Base defaults to the GitHub Pages project path; override with
// BASE_URL=/ for local static serving.
const base = process.env.BASE_URL ?? '/Astronomer/';

export default defineConfig({
  root: path.resolve(__dirname, 'src/web'),
  base,
  publicDir: path.resolve(__dirname, 'src/web/public'),
  build: {
    outDir: path.resolve(__dirname, 'dist-web'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/web/index.html')
      }
    }
  },
  server: {
    port: 5174
  },
  preview: {
    port: 4173
  }
});
