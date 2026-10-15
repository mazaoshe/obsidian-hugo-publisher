import { ItemView, Notice, TFile, type WorkspaceLeaf } from 'obsidian';
import type HugoPublisherPlugin from '../main';
import { createRenderer, listChannels } from '../channels';
import type { ChannelRenderer } from '../channels/types';
import { AutoSync } from '../core/auto-sync';
import { getActivePublishableFile } from '../core/active-file';
import { hugoOptions } from '../core/options';
import { preparePost, writePostIfChanged } from '../core/post';
import { isPortOpen } from '../core/hugo';
import { publishFile } from '../commands/actions';
import { copyFileAsToutiaoHtml, copyFileAsWechatHtml } from '../commands/export';
import { openExternalUrl } from '../utils/external';

/** Identifier for the sidebar preview view. */
export const HUGO_PREVIEW_VIEW_TYPE = 'hugo-preview-view';

/**
 * Sidebar view that previews the current note in one of the available
 * publishing channels.
 *
 * It owns the shared `hugo server` process for the blog channel, keeps the
 * draft copy in `content/posts/` in step with the note while the user types,
 * and hands rendering off to a {@link ChannelRenderer}.
 */
export class HugoPreviewView extends ItemView {
	private readonly autoSync: AutoSync;
	private renderer: ChannelRenderer | null = null;
	private cleanup: (() => void) | null = null;
	private currentFile: TFile | null = null;
	private currentUrl: string | null = null;
	private channelId = 'wechat';
	private serverError: string | null = null;
	private mountToken = 0;
	private refreshTimer: number | null = null;
	private tabsEl!: HTMLElement;
	private toolbar!: HTMLElement;
	private bodyEl!: HTMLElement;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: HugoPublisherPlugin,
	) {
		super(leaf);
		this.autoSync = new AutoSync(plugin);
	}

	getViewType(): string {
		return HUGO_PREVIEW_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Hugo 预览';
	}

	getIcon(): string {
		return 'globe';
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass('hugo-preview-view');
		this.tabsEl = this.contentEl.createDiv({ cls: 'hugo-preview-tabs' });
		this.toolbar = this.contentEl.createDiv({ cls: 'hugo-preview-toolbar' });
		this.bodyEl = this.contentEl.createDiv({ cls: 'hugo-preview-body' });
		this.ensureValidChannel();
		this.renderTabs();
		this.renderToolbar();

		// Keep the draft copy in step with the note while it is edited.
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (
					file instanceof TFile &&
					this.currentFile &&
					file.path === this.currentFile.path
				) {
					this.scheduleRefresh(file);
				}
			}),
		);

		// Follow the note the user is working on.
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.onActiveFileChanged();
			}),
		);

		this.onActiveFileChanged();
	}

	async onClose(): Promise<void> {
		this.autoSync.dispose();
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
		this.unmountRenderer();
		this.plugin.preview.stop();
		this.plugin.updateStatusBar();
		this.contentEl.empty();
	}

	/** Bind the preview to the active note when it is a publishable Markdown file. */
	private onActiveFileChanged(): void {
		const file = getActivePublishableFile(this.plugin);
		if (file && (!this.currentFile || file.path !== this.currentFile.path)) {
			this.currentFile = file;
			void this.mountChannel();
		}
	}

	/**
	 * Debounce a channel-appropriate refresh after the note changes.
	 *
	 * The blog channel rewrites the Hugo draft so the server's live reload picks
	 * it up; HTML channels re-render directly and need no slug or draft write.
	 */
	private scheduleRefresh(file: TFile): void {
		if (this.renderer?.needsServer) {
			this.autoSync.schedule(file);
			return;
		}

		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			void this.renderer?.refresh();
		}, this.plugin.settings.previewDebounceMs);
	}

	/** Rebuild the channel tabs at the top of the view. */
	private renderTabs(): void {
		this.tabsEl.empty();
		for (const channel of listChannels()) {
			if (!this.isChannelEnabled(channel.id)) continue;
			const tab = this.tabsEl.createEl('button', { text: channel.label });
			tab.toggleClass('is-active', channel.id === this.channelId);
			tab.addEventListener('click', () => {
				if (this.channelId === channel.id) return;
				this.channelId = channel.id;
				this.renderTabs();
				this.renderToolbar();
				void this.mountChannel();
			});
		}
	}

	/** Whether a channel is enabled in the settings. */
	private isChannelEnabled(id: string): boolean {
		switch (id) {
			case 'wechat':
				return this.plugin.settings.enableWechat;
			case 'toutiao':
				return this.plugin.settings.enableToutiao;
			case 'blog':
				return this.plugin.settings.enableBlog;
			default:
				return false;
		}
	}

	/** Switch to the first enabled channel when the current one is disabled. */
	private ensureValidChannel(): void {
		const enabled = listChannels().filter((channel) => this.isChannelEnabled(channel.id));
		if (enabled.length === 0) {
			this.channelId = '';
		} else if (!this.isChannelEnabled(this.channelId)) {
			this.channelId = enabled[0]?.id ?? '';
		}
	}

	/** Called by the plugin after the enabled channels change in settings. */
	onChannelsChanged(): void {
		const previous = this.channelId;
		this.ensureValidChannel();
		this.renderTabs();
		if (this.channelId !== previous) {
			this.renderToolbar();
			void this.mountChannel();
		}
	}

	/** Rebuild the action buttons for the active channel. */
	private renderToolbar(): void {
		this.toolbar.empty();

		this.toolbar.createDiv({ cls: 'hugo-preview-spacer' });

		const refresh = this.toolbar.createEl('button', { text: '刷新' });
		refresh.addEventListener('click', () => {
			void this.refreshPreview();
		});

		if (this.channelId === 'blog') {
			const open = this.toolbar.createEl('button', { text: '在浏览器打开' });
			open.addEventListener('click', () => {
				void this.openInBrowser();
			});

			const publish = this.toolbar.createEl('button', { text: '发布' });
			publish.addClass('mod-cta');
			publish.addEventListener('click', () => {
				void this.publishCurrent();
			});
		} else {
			const copy = this.toolbar.createEl('button', { text: '复制' });
			copy.addClass('mod-cta');
			copy.addEventListener('click', () => {
				void this.copyCurrent();
			});
		}
	}

	/**
	 * Mount the renderer for the current channel.
	 *
	 * Only the blog channel needs a slug, a draft copy in `content/posts/` and
	 * the Hugo server. HTML channels render the note directly, so switching to
	 * one also stops the server to free the port and memory.
	 */
	private async mountChannel(): Promise<void> {
		const token = ++this.mountToken;
		this.unmountRenderer();
		// The view owns the container, so it is cleared before every mount and
		// each renderer only appends its own output.
		this.bodyEl.empty();
		const file = this.currentFile;

		if (!file) {
			this.bodyEl.createEl('p', {
				text: '打开源文件夹里的 Markdown 笔记即可预览。',
			});
			this.currentUrl = null;
			return;
		}

		const renderer = createRenderer(this.channelId);
		if (!renderer) {
			this.bodyEl.createEl('p', {
				text:
					this.channelId === ''
						? '没有开启任何渠道。请在设置里至少开启一个。'
						: '未知渠道。',
			});
			return;
		}

		// HTML channels: stop the server (blog is no longer previewed) and render.
		if (!renderer.needsServer) {
			this.plugin.preview.stop();
			this.plugin.updateStatusBar();
			this.currentUrl = null;

			const cleanup = await renderer.mount({
				plugin: this.plugin,
				file,
				url: '',
				container: this.bodyEl,
			});
			if (token !== this.mountToken) {
				cleanup();
				return;
			}
			this.renderer = renderer;
			this.cleanup = cleanup;
			return;
		}

		// Blog channel: resolve the slug, sync the draft, then start the server.
		let prepared;
		try {
			prepared = await preparePost(this.plugin, file, 'preserve');
		} catch (error) {
			this.showError(error);
			return;
		}
		if (token !== this.mountToken) return;
		if (!prepared) {
			this.bodyEl.createEl('p', { text: '已取消预览。' });
			this.currentUrl = null;
			return;
		}

		try {
			await writePostIfChanged(prepared);
		} catch (error) {
			this.showError(error);
			return;
		}
		if (token !== this.mountToken) return;

		const baseUrl = await this.ensureServer();
		if (token !== this.mountToken) return;
		if (baseUrl === '') {
			this.bodyEl.createEl('p', {
				text: this.serverError
					? `无法启动 Hugo 预览服务：\n${this.serverError}`
					: 'Hugo 预览服务未运行。请从命令面板启动，或在设置里开启自动启动。',
			});
			return;
		}

		this.currentUrl = `${baseUrl}${prepared.slug}/`;
		const cleanup = await renderer.mount({
			plugin: this.plugin,
			file,
			url: this.currentUrl,
			container: this.bodyEl,
		});
		if (token !== this.mountToken) {
			// A newer mount superseded this one; release what we just created.
			cleanup();
			return;
		}

		this.renderer = renderer;
		this.cleanup = cleanup;
	}

	/** Stop and forget the active renderer. */
	private unmountRenderer(): void {
		if (this.cleanup) {
			this.cleanup();
			this.cleanup = null;
		}
		this.renderer = null;
	}

	/**
	 * Start `hugo server` unless it (or a previous session's server) is already
	 * running. An empty string means the view should show an error message.
	 */
	private async ensureServer(): Promise<string> {
		const port = this.plugin.settings.previewPort;
		const base = `http://localhost:${port}/`;
		this.serverError = null;

		if (this.plugin.preview.isRunning()) return base;

		// Reuse whatever is already serving on the port, e.g. a `hugo server`
		// that survived an unclean quit and still holds the port.
		if (await isPortOpen(port)) return base;

		if (!this.plugin.settings.autoStartPreview) return '';

		try {
			await this.plugin.preview.start(hugoOptions(this.plugin), port);
			this.plugin.updateStatusBar();
			return base;
		} catch (error) {
			this.plugin.updateStatusBar();
			this.serverError = error instanceof Error ? error.message : String(error);
			return '';
		}
	}

	/** Re-sync the draft (blog only) and ask the renderer to re-render. */
	private async refreshPreview(): Promise<void> {
		if (this.renderer?.needsServer && this.currentFile) {
			try {
				const prepared = await preparePost(this.plugin, this.currentFile, 'preserve');
				if (prepared) await writePostIfChanged(prepared);
			} catch (error) {
				this.showError(error);
			}
		}
		if (this.renderer) await this.renderer.refresh();
	}

	/** Open the current preview in the default browser. */
	private async openInBrowser(): Promise<void> {
		if (this.currentUrl) await openExternalUrl(this.currentUrl);
	}

	/** Publish the note currently bound to this preview. */
	private async publishCurrent(): Promise<void> {
		if (this.currentFile) await publishFile(this.plugin, this.currentFile);
	}

	/** Copy the note currently bound to this preview, as the active channel. */
	private async copyCurrent(): Promise<void> {
		if (!this.currentFile) return;
		if (this.channelId === 'wechat') {
			await copyFileAsWechatHtml(this.plugin, this.currentFile);
		} else {
			await copyFileAsToutiaoHtml(this.plugin, this.currentFile);
		}
	}

	private showError(error: unknown): void {
		const message = error instanceof Error ? error.message : String(error);
		console.error('[hugo-publisher] preview', error);
		new Notice(message, 8000);
	}
}

/**
 * Reveal the preview view in the right sidebar, reusing an existing leaf.
 */
export async function activatePreviewView(plugin: HugoPublisherPlugin): Promise<void> {
	const { workspace } = plugin.app;
	const existing = workspace.getLeavesOfType(HUGO_PREVIEW_VIEW_TYPE);

	if (existing.length > 0) {
		const [leaf] = existing;
		if (leaf) await workspace.revealLeaf(leaf);
		return;
	}

	const leaf = workspace.getRightLeaf(false);
	if (!leaf) return;

	await leaf.setViewState({ type: HUGO_PREVIEW_VIEW_TYPE, active: true });
	await workspace.revealLeaf(leaf);
}
