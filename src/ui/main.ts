import './styles.css';
import { configureSqlite } from '../core';
import { renderApp } from './app';

// Locate the sql.js WebAssembly binary. We serve it from the site root
// (copied into `public/` by scripts/copy-wasm.mjs), so the same path works in
// dev, in the production build, and behind the /anki-browser/ prefix.
const BASE: string = (import.meta as any).env?.BASE_URL ?? '/anki-browser/';
configureSqlite({ locateFile: (file: string) => BASE + file });

renderApp();
