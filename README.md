# Anki Browser — Open, Browse & Review .apkg / .colpkg in Your Browser

> **Free online Anki deck viewer and reviewer.** Open any `.apkg` or `.colpkg` Anki file, browse the cards and study with spaced repetition — right in your web browser. **No Anki install, no account, no upload** for opening & reviewing decks (your file never leaves your device). A separate, optional **community deck sharing** flow lets you publish decks for others; that flow uses your GitHub identity.
>
> 免费在线 Anki 卡组查看器与复习器。直接在浏览器里打开 `.apkg` / `.colpkg` 文件，浏览卡片并用间隔重复复习。**打开/复习卡组无需安装 Anki、无需注册、不上传文件**，文件只在你的设备上解析。另提供可选的**社区卡组分享**流程（用 GitHub 身份登录），用于发布卡组给他人。

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
- **Private by design** — opening/reviewing needs no account, no upload, no tracking
- **Progress tracking** — per-deck review progress saved locally (IndexedDB)
- **Responsive** — works on desktop, tablet and mobile
- **Bilingual** — full Chinese & English UI, mirrored landing pages, `hreflang` alternates
- **Community sharing** — submit a deck (cover, description, author, links) via GitHub OAuth; site owner moderates, then it auto-deploys to the gallery

## Search engine friendly

The deployed site includes dedicated, SEO-optimized landing pages for common search intents:

| URL | Target search intent |
|---|---|
| `/` | "Anki browser", "review Anki in browser" |
| `/apkg-viewer/` | "apkg viewer", "open .apkg online", ".apkg file viewer" |
| `/colpkg-viewer/` | "colpkg viewer", "open .colpkg", ".colpkg browser" |
| `/faq/` | "anki browser faq", "how to open apkg online" |
| `/privacy/`, `/terms/`, `/content-policy/` | compliance / trust pages |
| `/submit/` | "share anki deck" |
| `/zh/` | "anki 卡组 在线预览", "在线打开 anki" |
| `/zh/apkg-viewer/` | "apkg 查看器", ".apkg 怎么打开" |
| `/zh/colpkg-viewer/` | "colpkg 浏览器", ".colpkg 查看器" |
| `/zh/faq/` | "anki 浏览器 常见问题" |
| `/zh/privacy/`, `/zh/terms/`, `/zh/content-policy/` | 合规/信任页 |

Every landing page includes Open Graph / Twitter Card metadata, `hreflang` alternates (en ↔ zh), `FAQPage` / `BreadcrumbList` / `Organization` structured data (JSON-LD), a canonical URL, and an `llms.txt` — so search engines and AI tools can index, rank and answer questions about this tool correctly.

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
| i18n | Shared EN/ZH dictionary (`src/content/i18n.mjs`) with key-parity CI check |
| Hosting | Vercel + Cloudflare Worker (prefix rewrite) |
| Backend | Cloudflare Worker `anki-browser-api` (GitHub OAuth + submissions + moderation) |
| CI/CD | GitHub Actions (deploy on push to `public/decks/**`, `src/**`) |

## Project structure

```
anki-browser/
├── index.html                 # SPA shell (also source of truth for SEO meta)
├── src/
│   ├── content/
│   │   ├── render.mjs         # Shared HTML builders (SPA + SEO prerender)
│   │   ├── render.d.mts       # TypeScript declarations
│   │   ├── i18n.mjs           # EN/ZH dictionary + t() + parity check
│   │   ├── pages.mjs          # Content model (about/faq/legal) per language
│   │   ├── validate.mjs       # Shared submission validation (browser + Worker)
│   │   └── decks.ts           # Deck metadata loader
│   ├── core/                  # Parsers (AnkiPackage, sqlite, zstd, protobuf, scheduler)
│   ├── services/              # api.ts / auth.ts / submissions.ts / admin.ts
│   └── ui/
│       ├── app.ts             # Route dispatch + language sync
│       ├── router.ts          # Hash + pathname router
│       ├── i18n.ts            # Client language state (localStorage + URL)
│       ├── styles.css         # Anki-light theme, responsive
│       └── pages/             # home, deck, study, open, about, viewer, faq, legal, submit, admin
├── worker/
│   ├── api.js                 # CF Worker: GitHub OAuth + submissions + moderation
│   └── .build/                # (gitignored) bundled single-file Worker output
├── scripts/
│   ├── generate-seo.mjs       # SSR-like prerender: all pages, /zh/, sitemap, robots, llms.txt
│   ├── check-i18n.mjs         # EN/ZH key parity guard (fails the build on drift)
│   ├── deploy-worker.mjs      # Bundle + upload the API Worker via CF REST API
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
npm run dev          # starts Vite dev server on http://localhost:5273
npm run build        # full production build (i18n check + wasm + vite + SEO prerender)
npm run typecheck    # TypeScript --noEmit
npm run i18n:check   # EN/ZH key parity guard
npm run deploy:api   # bundle + upload the API Worker (requires CF token env)
```

### Build pipeline

```
npm run build
  ├── node scripts/check-i18n.mjs   # EN/ZH key parity (fails on drift)
  ├── node scripts/copy-wasm.mjs   # copy all sql.js wasm variants to public/
  ├── vite build                   # SPA bundle (emptyOutDir: false — see vite.config.ts)
  └── node scripts/generate-seo.mjs # write all pages (home/deck/viewer/faq/legal/submit),
                                    #   /zh/ mirrors, sitemap.xml, robots.txt, llms.txt (all in dist/)
```

The build is intentionally `emptyOutDir: false` because this project lives inside a cloud-sync folder where the host's safe-delete shim blocks `fs.rmSync`. `rm -rf dist` (shell) clears the folder before building.

## Adding a deck (self-service)

**Two ways** to get a deck into the gallery:

### 1. Submit from the website (community)

Visit the `/submit/` page, sign in with GitHub (read-only identity), and fill in the deck details (cover, title, description, author, download links, license). The site owner reviews it in the admin console and approves or rejects it; on approval it's committed to the registry and auto-deployed in ~2–3 minutes.

### 2. Edit the registry directly (owner)

1. Edit `public/decks/index.json` — add your deck with a `slug`, `title`, `content` (Markdown), and `downloads` (Baidu Netdisk, GitHub Release, direct link, etc.)
2. Commit to the `main` branch
3. GitHub Actions automatically builds and deploys

See `public/decks/README.md` for the full field reference.

### Moderation & the API Worker

Submissions flow through a separate Cloudflare Worker (`worker/api.js`, deployed as `anki-browser-api`):

- **Visitor submits** → Worker opens an issue in the submissions repo via a site bot PAT, `@`-mentioning the visitor (GitHub notifies them by email)
- **Owner moderates** in `/admin/` (approve / reject with a comment)
- **Approve** → the deck entry is committed to `public/decks/index.json`, which triggers the existing GitHub Action deploy; the visitor is notified on their issue
- **Reject** → a label + comment is posted; the visitor is notified

The Worker only requests GitHub `read:user` (identity, zero repo permissions) — no over-privileged OAuth scopes.

## Privacy

- **Opening / reviewing decks**: your `.apkg` / `.colpkg` files are **never uploaded**. Everything is parsed in the browser using WebAssembly.
- Review progress is stored in your browser's IndexedDB, keyed by a fingerprint of each deck. Clear your browser data and the progress clears too.
- No analytics, no tracking, no cookies beyond what's needed for routing.
- **Community sharing (optional)**: if you choose to submit a deck, you sign in with GitHub and we use your GitHub username to attribute the submission and notify you of the review outcome. See `/privacy/` for the full disclosure.

## License

MIT

## Author

Built by **Endril** ([endril.com](https://endril.com)) — spatial intelligence, remote sensing, and open learning tooling.

---

### Keywords

Anki, Anki browser, apkg viewer, colpkg viewer, open apkg online, apkg file viewer, anki deck viewer, spaced repetition, SM-2, flashcards, cloze, browser-based Anki, no install, no account, no upload, apkg 查看器, colpkg 浏览器, anki 卡组 在线预览, anki 在线复习
