# Hugo Publisher

一个 Obsidian 插件：把当前笔记一键发布到 Hugo 博客，并提供公众号、头条的内容预览和复制。

- 桌面端专用（需要调用本机的 `hugo` / `git` 命令）。
- 界面为中文。

## 功能

- **发布到 Hugo**：把当前笔记转成 Hugo 文章（自动转换 frontmatter），写入 Hugo 项目的 `content/posts/`，本地预览，再提交推送。
- **侧栏预览**：右侧栏实时预览，支持三个渠道标签页——
  - 博客：内嵌 `hugo server`，所见即所得，编辑时自动热更新。
  - 公众号：MWeb Indigo 风格排版，一键复制为富文本 HTML。
  - 头条：干净排版，一键复制。
- **两种发布方式**：内置 git 提交（只提交当前这篇文章），或调用你自己的发布脚本（如 `deploy.sh`）。
- **渠道开关**：公众号 / 头条 / 博客三个渠道可分别开关，只显示你要用的。

## 安装

### 方式一：BRAT（推荐）

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件。
2. 命令面板 → `BRAT: Add a beta plugin for testing`。
3. 输入 `mazaoshe/obsidian-hugo-publisher`，按提示启用。

### 方式二：手动

1. 从 [Releases](https://github.com/mazaoshe/obsidian-hugo-publisher/releases) 下载 `main.js`、`manifest.json`、`styles.css`。
2. 放入 `<你的库>/.obsidian/plugins/hugo-publisher/`。
3. 设置 → 第三方插件，启用 Hugo Publisher。

## 首次配置

默认路径指向作者本人的机器，**第一次使用务必在设置里改成你自己的**：

- **Hugo 项目根目录**：包含 `hugo.yml` 的目录。
- **库源文件夹**：你要发布/预览的笔记所在的文件夹（默认 `Content`）。
- **Hugo / Git 可执行文件**：绝对路径（Obsidian 不继承 shell 的 PATH）。
- **发布方式**：选「内置 Git 提交」或「调用发布脚本」（填你的脚本路径）。

## 命令

| 命令 | 作用 |
| --- | --- |
| 同步当前笔记到 Hugo | 把当前笔记写入 Hugo 内容目录（草稿，`draft: true`） |
| 启动预览 / 停止预览 | 手动控制 `hugo server` |
| 发布当前笔记 | 写入文章（`draft: false`）并按设置的方式推送上线 |
| 打开预览侧栏 | 打开右侧栏预览面板 |
| 复制为公众号 HTML / 复制为头条 HTML | 复制富文本，粘贴到对应编辑器 |

侧栏左上角是渠道标签页，右侧是刷新、复制（或「在浏览器打开」/「发布」）按钮。

## Frontmatter 转换

源笔记不会被修改，只生成一份发布层副本。

- **保留**：`title`、`tags`、`date`，以及你已经写好的发布字段。
- **去掉**：`type`、`status`、`related`、`content_role`、`content_package`、`channel`、`published_url`（知识库专属字段）。
- **自动补**（缺失时）：`slug`（弹窗填写）、`lastmod`、`draft`、`lang`、`categories`、`keywords`、`featured`、`hot`、`schema-type`、`schema-headline`。
- `description` 和 `cover` 为空时不写入。

## 开发

```bash
npm install
npm run dev        # 监听构建
npm run build      # 类型检查 + 生产打包
npm test           # 单元测试
npm run lint       # ESLint（eslint-plugin-obsidianmd）
```

技术栈：TypeScript + esbuild，遵循 Obsidian 官方 sample plugin 规范。

## 许可

0-BSD（见 LICENSE）。
