# 卡组分享与下载 — 站长维护指南

本页是**给你（站长）**看的，不是给访客看的。每个卡组的介绍页和下载链接都集中
在两个地方管理：

- **`public/decks/index.json`** — 卡组注册表（标题、标签、下载链接等元数据）
- **`public/decks/<slug>.md`** — 卡组的 Markdown 介绍文本

**全自动上线**：仓库已配置 GitHub Actions（`.github/workflows/deploy.yml`）。你只要
把改动 **push 到 `main` 分支**（或在 GitHub 网页上直接编辑提交），机器人会自动
构建并把站点部署到 Vercel——**不用跑任何命令，不用找 AI**。部署完成后介绍页会
出现在 `https://apps.endril.com/anki-browser/deck/<slug>/`。

> 网页上直接编辑的入口：GitHub 仓库 → `public/decks/` 文件夹 → 点进文件 →
> 右上角 ✏️ 铅笔图标编辑 → 拉到页面底部 Commit changes → 选 "main" 分支 → 提交。
> 提交后到仓库 Actions 页能看到自动部署在跑，约 2-3 分钟生效。

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
  "downloads": [
    {
      "url": "https://pan.baidu.com/s/1xxxxxxxxx",
      "label": "百度网盘",
      "note": "提取码: abcd"
    }
  ],
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
| `downloads` | **下载来源数组**，每个元素 `{ url, label?, note? }` | 强烈建议 |
| `previewFile` | 想让用户**直接在线浏览/试看**的 `.apkg` 路径（相对 `public/`） | 选填 |
| `markdown` | 介绍 Markdown 文件名（默认用 slug） | 选填 |
| `featured` | 是否在首页置顶（仅一个，建议留给最重要的） | 选填 |
| `updated` | 更新日期 `YYYY-MM-DD`，影响 sitemap `lastmod` | 选填 |

### `downloads` — 下载来源（不限于百度网盘）

`downloads` 是数组，可以放**任意形式**的下载链接：百度网盘、阿里云盘、GitHub Release、
蓝奏云、直链 CDN…… 每个元素：

```json
{ "url": "https://...", "label": "百度网盘", "note": "提取码: abcd" }
```

- `url`：下载链接（必填）
- `label`：按钮文字，会显示为 **"Download via {label}"**（例如 "Download via 百度网盘"）
- `note`：可选小字备注，比如百度网盘提取码、文件大小等

放多个就显示多个下载按钮。第一个会在"只有下载、没有在线预览"时变成主按钮。

> 兼容旧字段：如果只写了 `"baiduLink": "https://..."`，站点会自动当作一个
> label 为 "百度网盘" 的下载来源，无需迁移。

`downloads` 和 `previewFile` 至少配一个：

- 填了 `downloads`：页面显示对应的 **"Download via …"** 按钮
- 填了 `previewFile`：页面显示 **"Open in reviewer"** 按钮（访客直接在线浏览/试看，不用下载）
- 两个都填：先显示在线浏览按钮，再显示下载按钮

### 4. 提交并上线（自动部署）

把改动提交到 `main` 分支，GitHub Actions 会自动构建 + 部署：

```bash
git add public/decks/
git commit -m "Add deck: my-vocab"
git push origin main        # 推送后自动部署，约 2-3 分钟
```

> 不会用 git？直接在 GitHub 网页编辑 `index.json` 和 `<slug>.md` 并 Commit changes
> 到 main 分支，效果一样——Actions 会自动跑部署。

部署后：
- 首页 `https://apps.endril.com/anki-browser/` 多了一张新卡片
- 介绍页 `https://apps.endril.com/anki-browser/deck/my-vocab/` 自动生成 + 收录进 sitemap
- 部署进度可在仓库 **Actions** 页查看（绿色 ✓ = 成功）

---

## 修改 / 下架一个卡组

- **改文案**：编辑 `<slug>.md` 或 `index.json`，重新 build + deploy。
- **更新 `.apkg`**：替换 `public/decks/files/...` 中的文件，bump `index.json` 的 `updated` 字段，重新部署。
- **下架**：从 `index.json` 中删掉该条目，保留或删除 `<slug>.md` 和 `.apkg` 文件均可。

## 设计约定

- 卡片介绍页是**纯静态 SEO 预渲染**，所以 Baidu / Google 抓得到
- 用户在浏览器里的"复习"操作完全不经过服务器，IndexedDB 进度存在访客本机
- 所有卡组默认许可 `CC BY-NC 4.0`，改许可请编辑 `src/content/render.mjs` 的 `jsonLdDeck()`