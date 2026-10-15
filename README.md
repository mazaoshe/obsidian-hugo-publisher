# Hugo Publisher

An Obsidian plugin that turns the current note into a Hugo post: it converts the
frontmatter, writes the file into the Hugo content folder, previews it locally,
and then commits and pushes only that post.

Built for a personal vault (`Content/` drafts) and a Hugo site
(`content/posts/`), both on the same machine.

> **Note**: the default settings point to the author's own machine (macOS,
> Homebrew, and a Clash proxy on port 7897). Change them in the settings on
> first use. The UI is in Chinese.

## Commands

| Command | What it does |
| --- | --- |
| Sync current note to Hugo | Writes the active note into the Hugo content folder with `draft: true` and converted frontmatter. |
| Start preview | Runs `hugo server`, waits until it is reachable, then opens it in the browser. |
| Stop preview | Stops the preview process started by this plugin. |
| Publish current note | Writes the note with `draft: false`, optionally builds the site, then commits and pushes just this post. |
| Open preview sidebar | Opens a right-sidebar view that previews the current note, with live reload while you type. |
| Copy as WeChat HTML | Copies the current note as a WeChat-styled article (rich text) for pasting into the 公众号 editor. |
| Copy as Toutiao HTML | Copies the current note as a Toutiao-styled article for pasting into the 头条 editor. |

A globe ribbon icon opens the preview sidebar, which also has a Publish button.

## Sidebar preview

The preview sidebar drives the local `hugo server` and embeds its output in an
iframe, so the note renders with the real theme. While it is open, editing the
note rewrites the same draft file in the Hugo content folder (debounced) and
Hugo's live reload refreshes the page automatically. The toolbar offers channel
selection, width presets, a manual refresh, and open-in-browser.

The preview is built on a channel abstraction (`src/channels/`). Three channels are
available in the sidebar dropdown:

- **博客**: embeds the running Hugo server in an iframe.
- **公众号** / **头条**: render the note body to inline-styled HTML (there is no
  official publishing API for personal accounts), so the same HTML is both
  previewed and copied to the clipboard for pasting into the platform editor.

Channel styling lives in `src/core/markdown-html.ts` (markdown-it + inline
styles). Adding a platform means adding a renderer plus a style object.

## Frontmatter conversion

The source note is never modified. Only a publish-layer copy is written.

- Kept: `title`, `tags`, `date`, and any publish field already set.
- Dropped: `type`, `status`, `related`, `content_role`, `content_package`,
  `channel`, `published_url`.
- Filled when missing: `slug` (prompted for), `lastmod`, `draft`, `lang`
  (`zh-cn`), `categories`, `keywords`, `featured`, `hot`, `schema-type`
  (`TechArticle`), `schema-headline`.
- `description` and `cover` are written only when non-empty.

The slug is remembered from an already-synced post, so it is only asked once.

## Settings

- **Hugo project root**, **content subdirectory**, **vault source folder**
- **Hugo binary**, **Git binary**, **extra PATH entries**
- **Preview port**, **open preview in browser**
- **Build before publishing**, **use proxy for Git push**, **proxy URL**
- **Git remote**, **Git branch**

Absolute paths matter: Obsidian is launched by the window server and does not
inherit the PATH of a login shell, so `hugo` and `git` are not on `PATH` unless
their directories are listed in **extra PATH entries**.

## Development

```bash
npm install
npm run dev        # watch build
npm run build      # type-check + production bundle
npm test           # frontmatter unit tests
npm run lint
```

Install into a vault by copying (or symlinking) `main.js`, `manifest.json` and
`styles.css` into `<Vault>/.obsidian/plugins/hugo-publisher/`, then enable
**Hugo Publisher** in **Settings → Community plugins**.

## Scope and privacy

This plugin is desktop-only. It intentionally works outside the vault: it writes
into the configured Hugo project and runs `hugo` and `git` as child processes.
Nothing leaves the machine except the `git push` you explicitly confirm, and no
telemetry is collected.
