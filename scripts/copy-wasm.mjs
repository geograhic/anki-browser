/**
 * Copy the sql.js WebAssembly binaries next to the app so they can be located
 * at runtime. `main.ts` configures `locateFile` to return `<base>/<file>`, and
 * the browser build of sql.js requests `sql-wasm-browser.wasm` (while the
 * standard build requests `sql-wasm.wasm`). By copying every `sql-wasm*.wasm`
 * variant into `public/`, Vite serves them at `<base>/...` in dev and copies
 * them into `dist/` for production — one source, all environments.
 */
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(root, 'node_modules/sql.js/dist');
const destDir = resolve(root, 'public');

if (!existsSync(srcDir)) {
  console.error('sql.js dist not found at', srcDir, '- run `npm install` first.');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });

const variants = readdirSync(srcDir).filter(
  (f) => /^sql-wasm.*\.wasm$/.test(f) && !f.includes('-debug')
);

if (variants.length === 0) {
  console.error('No sql.js wasm variants found in', srcDir);
  process.exit(1);
}

for (const name of variants) {
  copyFileSync(resolve(srcDir, name), resolve(destDir, name));
  console.log('copied', name, '->', resolve(destDir, name));
}
