# Adding a Deck to Anki Browser

Anki Browser shows shared decks on the home page, each with its own intro page at
`https://apps.endril.com/anki-browser/deck/<slug>/`.

**Everything about a deck lives in one file: `public/decks/index.json`** — the title,
the intro text (`content`), the download links (`downloads`) and the tags. Edit that
file, commit to `main`, and the site rebuilds and redeploys automatically
(via GitHub Actions; the deploy usually finishes in 2–3 minutes).

---

## How to add a deck (3 steps)

### 1. Prepare the `.apkg` file

Put the Anki package under `public/decks/files/` (Vite copies it to the site as-is).

> Use an ASCII-safe filename (e.g. `my-vocab-v2.apkg`). Files up to ~30 MB can live
> in the repo. For larger files, use a download link (netdisk / direct URL) and
> leave `previewFile` empty.

### 2. Append one entry to `public/decks/index.json`

Open `public/decks/index.json` and add a new object at the end of the array
(put a `,` after the previous `}` if it isn't the last):

```json
{
  "slug": "my-vocab",
  "title": "My Vocab",
  "subtitle": "One-line subtitle shown on the home page card",
  "description": "Detailed description for SEO and social sharing (1-2 sentences)",
  "tags": ["English", "Vocabulary"],
  "language": "en",
  "cover": "",
  "downloads": [
    {
      "url": "https://pan.baidu.com/s/1xxxxxxxxx",
      "label": "百度网盘",
      "note": "提取码: abcd"
    }
  ],
  "previewFile": "",
  "content": "# My Vocab\n\nA short intro about this deck: who it is for, what card types it uses, etc.\n\n## What's inside\n\n- **Basic** cards\n- **Cloze** cards\n\n## How to use\n\n1. Download the package from the link above.\n2. Open it in your browser — no Anki software, no account.\n3. Browse or review with the built-in reviewer.",
  "featured": false,
  "updated": "2026-08-23"
}
```

> `content` is the Markdown intro page body. Use `\n` for newlines. Supported syntax:
> headings `#`–`####`, bullet / numbered lists, blockquotes `> `, horizontal rules
> `---`, inline `code`, **bold**, *italic* and [links](url).

### 3. Commit to `main`

```bash
git add public/decks/index.json
git commit -m "Add deck: my-vocab"
git push origin main
```

No git? Edit `index.json` directly on github.com (the ✏️ pencil button) and commit
changes to the `main` branch. Watch the **Actions** tab for the deploy progress
(green ✓ = done).

After the deploy:
- A new card appears on the home page
- The deck page `https://apps.endril.com/anki-browser/deck/my-vocab/` is generated
  and included in the sitemap

---

## Field reference

| Field | Purpose | Required |
|---|---|---|
| `slug` | URL segment, e.g. `my-vocab` → `/deck/my-vocab/` | ✅ |
| `title` | Deck name (page title, card cover letter, `<title>` tag) | ✅ |
| `content` | **Intro page Markdown** (inline, `\n` for newlines) | recommended |
| `subtitle` | Subtitle under the home page card | optional |
| `description` | SEO / social-sharing description (1–2 sentences) | recommended |
| `tags` | Tag chips shown on the page | optional |
| `language` | BCP-47 code (`en`, `zh-CN`, …) | optional |
| `cover` | Custom cover image URL (defaults to a letter gradient) | optional |
| `downloads` | **Download sources**, array of `{ url, label?, note? }` | recommended |
| `previewFile` | An `.apkg` browsable online (path relative to `public/`) | optional |
| `featured` | Pin to the top of the home page (use for one deck max) | optional |
| `updated` | `YYYY-MM-DD`, feeds the sitemap `lastmod` | optional |

### `downloads` — any kind of download link

`downloads` accepts **any** download form: Baidu / Alibaba netdisks, GitHub Releases,
Lanzou, direct CDN URLs… Each entry:

```json
{ "url": "https://...", "label": "百度网盘", "note": "提取码: abcd" }
```

- `url` — the download link (required)
- `label` — button text, rendered as **"Download via {label}"**
- `note` — optional small hint (extract code, file size…)

Multiple entries produce multiple buttons. When a deck has no online preview, the
first entry becomes the primary button.

Have `downloads` or `previewFile` at least:

- `downloads` set → the page shows **"Download via …"** buttons
- `previewFile` set → the page shows **"Open in reviewer"** (visitors browse online,
  no download needed)
- both set → online preview first, then download buttons

### Legacy fields

- `"baiduLink": "https://…"` — treated as one download source labelled "百度网盘"
- `"markdown": "my-vocab.md"` — when `content` is absent, the page reads the
  `public/decks/my-vocab.md` file instead (older approach, still supported)

---

## Updating / removing a deck

- **Edit copy or links**: change `content` / `downloads` in `index.json`, commit — done
- **Update the `.apkg`**: replace the file under `public/decks/files/`, bump `updated`, commit
- **Remove**: delete the entry from `index.json`, commit — the page and sitemap entry
  disappear after the next deploy

## Design notes

- Deck pages are statically prerendered for SEO (crawlable by search engines)
- Visitors browse and review **entirely in their browser**: no registration, no
  uploads, no Anki desktop app
- Review progress is stored locally in each visitor's browser (IndexedDB)
- Decks are shared under `CC BY-NC 4.0` by default
