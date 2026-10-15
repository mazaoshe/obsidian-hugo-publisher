# Obsidian community plugin

A desktop-only Obsidian plugin (TypeScript → bundled JavaScript) that publishes
the current note to a Hugo site.

## Project overview

- Entry point: `src/main.ts`, compiled to `main.js` and loaded by Obsidian.
- Required release artifacts: `main.js`, `manifest.json`, and `styles.css`.

## Environment and tooling

- Node.js: current LTS.
- Package manager: npm.
- Bundler: esbuild (`esbuild.config.mjs`).
- Types: `obsidian` type definitions.

### Commands

```bash
npm install
npm run dev        # watch build
npm run build      # type-check + production bundle
npm test           # frontmatter unit tests (node --test)
npm run lint       # eslint with eslint-plugin-obsidianmd
```

## Structure

```
src/
  main.ts            Plugin entry point, lifecycle only
  settings.ts        Settings interface, defaults and tab
  types.ts           Shared types
  commands/
    index.ts         Command registration
    actions.ts       Sync, preview and publish orchestration
  core/
    frontmatter.ts   Pure frontmatter transform (unit tested)
    note.ts          Vault reads plus YAML parsing/serialisation
    post.ts          Slug resolution, post rendering, draft handling
    active-file.ts   Publishable-file detection
    auto-sync.ts     Debounced draft rewrite while editing
    markdown-html.ts Markdown → inline-styled HTML for HTML channels
    hugo.ts          `hugo server` lifecycle and site build
    git.ts           Scoped add/commit/push
    options.ts       Hugo/Git child-process options
  channels/
    types.ts         ChannelRenderer interface
    blog-channel.ts  Blog renderer (iframe into hugo server)
    html-channel.ts  Base class for HTML renderers
    wechat-channel.ts / toutiao-channel.ts
    index.ts         Channel registry
  commands/
    index.ts         Command registration
    actions.ts       Sync, preview and publish orchestration
    export.ts        Copy note as channel HTML
  ui/
    preview-view.ts  Sidebar preview view
    slug-modal.ts    Slug prompt
    confirm-modal.ts Confirmation dialog
  utils/
    process.ts       Child process helpers and PATH handling
    paths.ts         Filesystem path helpers
    external.ts      Open a URL in the default browser
tests/
  frontmatter.test.mjs
```

`main.ts` stays minimal: settings, ribbon, status bar, and a cleanup hook for the
preview process. Feature logic lives in `commands/` and `core/`.

## Modules without runtime relative imports

`src/core/frontmatter.ts` is loaded directly by `node --test` via Node's
built-in TypeScript type stripping, which requires explicit `.ts` extensions and
cannot resolve extensionless relative imports. Keep that file self-contained
(type-only imports are fine) so the unit tests keep running without a build step.

## Conventions

- Tabs for indentation, single quotes, LF, UTF-8.
- TSDoc for exported functions and types; inline `//` for local reasoning.
- Split files that grow past roughly 250 lines.
- Register listeners, intervals and processes through `this.register*` so unload
  is clean.
- UI text uses sentence case; `Hugo`, `Markdown`, `Git` and `GitHub` are
  configured as brands in `eslint.config.mts` so they keep their casing.

## Known lint warning

`obsidianmd/settings-tab/prefer-setting-definitions` warns because the settings
tab uses the imperative `display()` API instead of the declarative
`getSettingDefinitions()` API added in Obsidian 1.13. The official sample plugin
still uses `display()`, and keeping it preserves compatibility with
`minAppVersion` below 1.13. Migrate when the minimum version is raised.

## Manifest rules

- Keep `id` stable; it must match the plugin folder name.
- Bump `version` (SemVer) and update `versions.json` together.

## Testing

Unit tests cover the pure frontmatter transform. For an end-to-end check, open a
note in the vault's source folder and run **Sync**, **Start preview**, then
**Publish**.
