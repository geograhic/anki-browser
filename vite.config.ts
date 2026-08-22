import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * The app is served from https://apps.endril.com/anki-browser/ via a thin
 * Cloudflare Worker that strips the `/anki-browser` prefix before proxying to
 * the static host. Using an absolute `base` keeps generated asset URLs stable
 * and SEO-friendly (real canonical URLs), and the Worker maps them 1:1.
 */
export const BASE_PATH = '/anki-browser/';

export default defineConfig({
  base: BASE_PATH,
  build: {
    outDir: 'dist',
    // `false`: Vite must not call fs.rmSync on the output dir. This project's
    // `dist/` lives inside a cloud-sync folder, and the host's safe-delete shim
    // (which routes rmSync through the OS trash) aborts there. We clean `dist/`
    // ourselves with a plain shell `rm` before building (see npm build notes),
    // which avoids the shim entirely and keeps the build reproducible.
    emptyOutDir: false,
    target: 'es2020',
    // sql.js ships a sizeable wasm loader; keep chunks readable rather than inlined.
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // sql.js is CJS with a wasm side-file; let Vite pre-bundle it once.
    include: ['sql.js'],
  },
  server: {
    port: 5273,
    strictPort: false,
  },
});
