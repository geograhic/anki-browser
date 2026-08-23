# Anki Browser — Open, Browse & Review .apkg / .colpkg in Your Browser

> **Free online Anki deck viewer and reviewer.** Open any `.apkg` or `.colpkg` Anki file, browse the cards and study with spaced repetition — right in your web browser. **No Anki install, no account, no upload.** Your file never leaves your device.
>
> 免费在线 Anki 卡组查看器与复习器。直接在浏览器里打开 `.apkg` / `.colpkg` 文件，浏览卡片并用间隔重复复习。**无需安装 Anki、无需注册、不上传文件**，文件只在你的设备上解析。

**Live demo:** https://apps.endril.com/anki-browser/

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)

---

## What it is

Anki Browser is a **client-side only** web app that parses Anki deck files (`.apkg` shared decks and `.colpkg` collection backups) entirely in your browser using WebAssembly. Everything runs locally — no backend, no server-side processing, no cloud storage.

- **View** every card in the deck (text, images, audio, cloze deletions)
- **Review** with a full SM-2 spaced-repetition scheduler (Again / Hard / Good / Easy)
- **Track** progress per deck, stored in your browser's IndexedDB
- **Browse mode** to flip through cards without studying

## Why in the browser?

| Without Anki Browser | With Anki Browser |
|---|---|
| Must install Anki desktop app | Works in any modern browser |
| No app on phone/tablet? Can't open files | Works on phone, tablet, desktop |
| Need to trust the software vendor with your data | Nothing leaves your device |
| Setup time: minutes to hours | Setup time: seconds |

## Features

- **APKG viewer** — open `.apkg` shared decks instantly
- **COLPKG viewer** — open entire `.colpkg` collection backups
- **Full review scheduler** — classic SM-2 algorithm, same intervals as Anki
- **Media support** — images, audio, video, cloze deletions all render inline
- **Private by design** — no account, no registration, no upload, no tracking
- **Progress tracking** — per-deck review progress saved locally (IndexedDB)
- **Responsive** — works on desktop, tablet and mobile
- **Chinese** — full Chinese UI and landing pages at `/zh/`

## Search engine friendly

The deployed site includes dedicated, SEO-optimized landing pages for common search intents:

| URL | Target search intent |
|---|---|
| `/` | "Anki browser", "review Anki in browser" |
| `/apkg-viewer/` | "apkg viewer", "open .apkg online", ".apkg file viewer" |
| `/colpkg-viewer/` | "colpkg viewer", "open .colpkg", ".colpkg browser" |
| `/zh/` | "anki 卡组 在线预览", "在线打开 anki" |
| `/zh/apkg-viewer/` | "apkg 查看器", ".apkg 怎么打开" |
| `/zh/colpkg-viewer/` | "colpkg 浏览器", ".colpkg 查看器" |

Every landing page includes Open Graph / Twitter Card metadata, `hreflang` alternates (en ↔ zh), `FAQPage` structured data (JSON-LD), and a canonical URL — so search engines and AI tools can index, rank and answer questions about this tool correctly.

## Tech stack

| Layer | Technology |
|---|---|
| Build | Vite 5 + TypeScript 5 |
| Archive parsing | `fflate` (ZIP) + `fzstd` (zstd) |
| Database | `sql.js` (SQLite compiled to WebAssembly) |
| Anki protobuf | Hand-written v14 protobuf reader |
| Scheduler | SM-2 spaced repetition (same algorithm as Anki) |
| Template rendering | Custom HTML renderer (Markdown, cloze, LaTeX via KaTeX) |
| Storage | IndexedDB (per-deck progress, keyed by deck fingerprint) |
| Router | Hash + pathname hybrid |
| Hosting | Vercel + Cloudflare Worker (prefix rewrite) |
| CI/CD | GitHub Actions (deploy on push to `public/decks/**`, `src/**`) |

## Project structure

```
anki-browser/
├── index.html                 # SPA shell (also source of truth for SEO meta)
├── src/
│   ├── content/
│   │   ├── render.mjs         # Shared HTML builders (SPA + SEO prerender)
│   │   ├── render.d.mts       # TypeScript declarations
│   │   └── decks.ts           # Deck metadata loader
│   ├── core/                  # Parsers (AnkiPackage, sqlite, zstd, protobuf, scheduler)
│   └── ui/
│       ├── app.ts             # Route dispatch
│       ├── router.ts          # Hash + pathname router
│       ├── styles.css         # Anki-light theme, responsive
│       └── pages/             # home, deck, study, open, about, viewer (landing pages)
├── scripts/
│   ├── generate-seo.mjs       # SSR-like prerender: home, deck, viewer pages, sitemap, robots
│   ├── copy-wasm.mjs          # Copy sql.js wasm variants to public/
│   └── deploy-vercel.mjs      # Deploy dist/ to Vercel via REST API
├── public/
│   ├── og-image.png           # Open Graph share image (1200×630)
│   ├── sql-wasm*.wasm         # sql.js WebAssembly binaries
│   └── decks/
│       ├── index.json         # Deck registry (edit this to add decks)
│       └── README.md          # Public guide for adding a deck
└── .github/workflows/deploy.yml
```

## Quick start (local development)

```bash
npm install
npm run dev        # starts Vite dev server on http://localhost:5273
npm run build      # full production build (copy-wasm + vite + SEO prerender)
npm run typecheck  # TypeScript --noEmit
```

### Build pipeline

```
npm run build
  ├── node scripts/copy-wasm.mjs   # copy all sql.js wasm variants to public/
  ├── vite build                   # SPA bundle (emptyOutDir: false — see vite.config.ts)
  └── node scripts/generate-seo.mjs # write index.html, deck pages, viewer pages, /zh/ pages,
                                    #   sitemap.xml, robots.txt (all in dist/)
```

The build is intentionally `emptyOutDir: false` because this project lives inside a cloud-sync folder where the host's safe-delete shim blocks `fs.rmSync`. `rm -rf dist` (shell) clears the folder before building.

## Adding a deck (self-service)

1. Edit `public/decks/index.json` — add your deck with a `slug`, `title`, `content` (Markdown), and `downloads` (Baidu Netdisk, GitHub Release, direct link, etc.)
2. Commit to the `main` branch
3. GitHub Actions automatically builds and deploys

See `public/decks/README.md` for the full field reference.

## Privacy

- Your `.apkg` / `.colpkg` files are **never uploaded**. Everything is parsed in the browser using WebAssembly.
- Review progress is stored in your browser's IndexedDB, keyed by a fingerprint of each deck. Clear your browser data and the progress clears too.
- No analytics, no tracking, no cookies beyond what's needed for routing.

## License

MIT

## Author

Built by **Endril** ([endril.com](https://endril.com)) — spatial intelligence, remote sensing, and open learning tooling.

---

### Keywords

Anki, Anki browser, apkg viewer, colpkg viewer, open apkg online, apkg file viewer, anki deck viewer, spaced repetition, SM-2, flashcards, cloze, browser-based Anki, no install, no account, no upload, apkg 查看器, colpkg 浏览器, anki 卡组 在线预览, anki 在线复习
