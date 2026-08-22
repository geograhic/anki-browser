# 卡组分享与下载 — 站长维护指南

本页是**给你（站长）**看的，不是给访客看的。**所有卡组的介绍页和下载链接都集中
在同一个文件里管理：**

- **`public/decks/index.json`** — 卡组注册表：标题、介绍文本（`content`）、
  下载链接（`downloads`）、标签等，全部在这一个文件里

**全自动上线**：仓库已配置 GitHub Actions（`.github/workflows/deploy.yml`）。你只要
把改动 **push 到 `main` 分支**（或在 GitHub 网页上直接编辑提交），机器人会自动
构建并把站点部署到 Vercel——**不用跑任何命令，不用找 AI**。部署完成后介绍页会
出现在 `https://apps.endril.com/anki-browser/deck/<slug>/`。

> 网页上直接编辑的入口：GitHub 仓库 → `public/decks/` → 点开 `index.json` →
> 右上角 ✏️ 铅笔图标编辑 → 底部 Commit changes → 选 "main" → 提交。
> 提交后到仓库 **Actions** 页能看到自动部署在跑，约 2-3 分钟生效。

---

## 添加一个新卡组（三步，全部在 index.json 里完成）

### 第 1 步：准备 `.apkg` 文件

把你想分享的 Anki 包放到 `public/decks/files/` 下（Vite 会原样拷到线上）。

> 文件名用 ASCII 安全名字（如 `my-vocab-v2.apkg`）；~30MB 以内可直接放仓库。
> 更大的文件走下载链接（网盘/直链），`previewFile` 留空即可。

### 第 2 步：在 `index.json` 追加一个卡组条目

打开 `public/decks/index.json`，在数组末尾（最后一个 `}` 后面加 `,` 再粘贴）：

```json
{
  "slug": "my-vocab",
  "title": "My Vocab",
  "subtitle": "一句话副标题（首页卡片上显示）",
  "description": "给 SEO / 社交分享用的详细描述（1-2 句话）",
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
  "content": "# My Vocab\n\n简短介绍这个卡组是干什么的、适用人群、卡片类型等。\n\n## What's inside\n\n- **Basic** cards\n- **Cloze** cards\n\n## How to use\n\n1. Download the package from the link above.\n2. Open it in your browser — no Anki software, no account.\n3. Browse or review with the built-in reviewer.",
  "featured": false,
  "updated": "2026-08-23"
}
```

> `content` 里是卡组介绍页的 Markdown 正文（用 `\n` 换行，标题用 `##`，列表用 `-`）。
> 支持：标题 `#`~`####`、无序/有序列表、引用 `> `、水平线 `---`、行内
> `code` / **bold** / *italic* / [link](url)。够用就行。

### 第 3 步：提交，等自动部署

```bash
git add public/decks/index.json
git commit -m "Add deck: my-vocab"
git push origin main        # Actions 自动构建+部署，约 2-3 分钟
```

不会用 git？直接在 GitHub 网页上改 `index.json` 然后 Commit changes 到 main 即可。

部署后：
- 首页 `https://apps.endril.com/anki-browser/` 多了一张新卡片
- 介绍页 `https://apps.endril.com/anki-browser/deck/my-vocab/` 自动生成 + 收录进 sitemap
- 部署进度看仓库 **Actions** 页（绿色 ✓ = 成功）

---

## 字段说明

| 字段 | 用途 | 必填 |
|---|---|---|
| `slug` | URL 段，例如 `my-vocab` → `/deck/my-vocab/` | ✅ |
| `title` | 卡组名（标题、封面首字母、`<title>` 标签） | ✅ |
| `content` | **介绍页 Markdown 正文**（内联，`\n` 换行） | 建议 |
| `subtitle` | 副标题，显示在首页卡片下方 | 选填 |
| `description` | SEO / 社交分享描述，1-2 句话 | 强烈建议 |
| `tags` | 标签数组，显示为蓝色 chip | 选填 |
| `language` | BCP-47 语言码（`en` / `zh-CN` …） | 选填 |
| `cover` | 自定义封面图 URL（留空用首字母渐变） | 选填 |
| `downloads` | **下载来源数组**，每个 `{ url, label?, note? }` | 建议 |
| `previewFile` | 可在线浏览的 `.apkg` 路径（相对 `public/`） | 选填 |
| `featured` | 是否首页置顶（建议只给一个） | 选填 |
| `updated` | 更新日期 `YYYY-MM-DD`，影响 sitemap | 选填 |

### `downloads` — 下载来源（不限于百度网盘）

`downloads` 是数组，可放**任意形式**的下载链接：百度网盘、阿里云盘、GitHub Release、
蓝奏云、直链 CDN…… 每个元素：

```json
{ "url": "https://...", "label": "百度网盘", "note": "提取码: abcd" }
```

- `url`：下载链接（必填）
- `label`：按钮文字 → 显示为 **"Download via {label}"**（如 "Download via 百度网盘"）
- `note`：可选小字备注（提取码、文件大小等）

放多个就显示多个下载按钮。只有下载、没有在线预览时，第一个会自动变成主按钮。

`downloads` 和 `previewFile` 至少配一个：

- 填了 `downloads`：页面显示对应的 **"Download via …"** 按钮
- 填了 `previewFile`：页面显示 **"Open in reviewer"** 按钮（访客直接在线浏览，不用下载）
- 两个都填：先显示在线浏览按钮，再显示下载按钮

### 旧字段兼容

- `"baiduLink": "https://..."`：自动当作一个 label="百度网盘" 的下载来源
- `"markdown": "my-vocab.md"`：如果没写 `content`，会去读 `public/decks/my-vocab.md`
  文件（旧的 .md 方案仍然可用，但新卡组推荐直接用内联 `content`）

---

## 修改 / 下架一个卡组

- **改文案/换链接**：改 `index.json` 里对应条目的 `content` / `downloads`，提交即生效
- **更新 `.apkg`**：替换 `public/decks/files/...` 里的文件，把 `updated` 改成当天日期，提交
- **下架**：从 `index.json` 删掉该条目，提交即可（页面和 sitemap 自动消失）

## 设计约定

- 卡组介绍页是**纯静态 SEO 预渲染**，Baidu / Google 都能抓取
- 访客在浏览器里的"浏览/复习"完全本地运行：无注册、无上传、不依赖 Anki 软件
- 复习进度存在访客自己的浏览器（IndexedDB），与你无关
- 卡组默认许可 `CC BY-NC 4.0`（改许可需动 `src/content/render.mjs` 的 `jsonLdDeck()`）
