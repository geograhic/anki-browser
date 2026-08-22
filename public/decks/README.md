# 卡组分享与下载 — 站长维护指南

本页是**给你（站长）**看的，不是给访客看的。每个卡组的介绍页和下载链接都集中
在两个地方管理：

- **`public/decks/index.json`** — 卡组注册表（标题、标签、Baidu 网盘链接等元数据）
- **`public/decks/<slug>.md`** — 卡组的 Markdown 介绍文本

只要改这两个地方 + 跑一次部署，卡组的介绍页就会出现在 `https://apps.endril.com/anki-browser/deck/<slug>/`。

---

## 添加一个新卡组的完整流程

### 1. 准备 `.apkg` 文件

把你想分享的 Anki 包放在 `public/decks/files/` 下（Vite 静态资源会原样拷到 `dist/`）。

> 文件名建议用 ASCII 安全的名字（例如 `my-vocab-v2.apkg`），避免路径里的特殊字符。
> 单个文件 ~30MB 以内都没问题；再大请用 Baidu 网盘外链 + 标记 `previewFile: ""`。

### 2. 写一份 `<slug>.md`

文件名 = 卡组 `slug`，例如 `public/decks/my-vocab.md`：

```markdown
# My Vocab

简短介绍这个卡组是干什么的、适用人群、卡片类型等。

## What's inside

- **Basic** cards
- **Cloze** cards

## How to use

1. Download the package from the Baidu link below.
2. Open it in your browser.
3. Review with the four rating buttons.

## Notes

- License / 备注 / 二开说明 …
```

支持的 Markdown 语法：标题（`#` ~ `####`）、无序 / 有序列表、引用 `> `、水平线 `---`、
行内 `code` / **bold** / *italic* / [link](url)。够用就行。

### 3. 在 `public/decks/index.json` 注册

打开 `public/decks/index.json`，在末尾追加一项：

```json
{
  "slug": "my-vocab",
  "title": "My Vocab",
  "subtitle": "一句话副标题（首页卡片上显示）",
  "description": "给 SEO / og:description 用的更详细描述（1-2 句话）",
  "tags": ["English", "Vocabulary"],
  "language": "en",
  "cover": "",
  "baiduLink": "https://pan.baidu.com/s/1xxxxxxxxx",
  "previewFile": "",
  "markdown": "my-vocab.md",
  "featured": false,
  "updated": "2026-08-23"
}
```

字段说明：

| 字段 | 用途 | 必填 |
|---|---|---|
| `slug` | URL 段和 Markdown 文件名，例如 `my-vocab` → `/deck/my-vocab/` | ✅ |
| `title` | 卡组名（标题、卡片封面首字母、`<title>` 标签） | ✅ |
| `subtitle` | 副标题，显示在首页卡片下方 | 选填 |
| `description` | SEO / 社交分享描述，1-2 句话 | 强烈建议 |
| `tags` | 标签数组，显示为蓝色 chip | 选填 |
| `language` | BCP-47 语言码（`en` / `zh-CN` …） | 选填 |
| `cover` | 自定义封面图 URL（留空就用首字母渐变） | 选填 |
| `baiduLink` | **百度网盘分享链接**（这就是"下载"按钮指向的地方） | 强烈建议 |
| `previewFile` | 想让用户**直接在线试看**的 `.apkg` 路径（相对 `public/`） | 选填 |
| `markdown` | 介绍 Markdown 文件名（默认用 slug） | 选填 |
| `featured` | 是否在首页置顶（仅一个，建议留给最重要的） | 选填 |
| `updated` | 更新日期 `YYYY-MM-DD`，影响 sitemap `lastmod` | 选填 |

`baiduLink` 和 `previewFile` 至少填一个：

- 填了 `baiduLink`：页面显示 **"Download via Baidu Netdisk"** 按钮
- 填了 `previewFile`：页面显示 **"Open in reviewer"** 按钮（访客直接试看，不用下载）
- 两个都填：两个按钮都显示

### 4. 构建并部署

```bash
npm run build                       # 构建 + 生成 SEO 预渲染页
node scripts/deploy-vercel.mjs      # 部署 dist/ 到 Vercel
# 然后把 dist 的更改 push 到 GitHub：
git add public/decks/
git commit -m "Add deck: my-vocab"
git push origin master:main
```

部署后：
- 首页 `https://apps.endril.com/anki-browser/` 多了一张新卡片
- 介绍页 `https://apps.endril.com/anki-browser/deck/my-vocab/` 自动生成 + 收录进 sitemap

---

## 修改 / 下架一个卡组

- **改文案**：编辑 `<slug>.md` 或 `index.json`，重新 build + deploy。
- **更新 `.apkg`**：替换 `public/decks/files/...` 中的文件，bump `index.json` 的 `updated` 字段，重新部署。
- **下架**：从 `index.json` 中删掉该条目，保留或删除 `<slug>.md` 和 `.apkg` 文件均可。

## 设计约定

- 卡片介绍页是**纯静态 SEO 预渲染**，所以 Baidu / Google 抓得到
- 用户在浏览器里的"复习"操作完全不经过服务器，IndexedDB 进度存在访客本机
- 所有卡组默认许可 `CC BY-NC 4.0`，改许可请编辑 `src/content/render.mjs` 的 `jsonLdDeck()`