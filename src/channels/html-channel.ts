import type { ChannelPreviewContext, ChannelRenderer } from './types';
import { readNoteSource } from '../core/note';
import { renderChannelArticle, type ChannelStyle } from '../core/markdown-html';

/**
 * Base class for the HTML-based channels (WeChat, Toutiao).
 *
 * Unlike the blog channel, these render the note body to inline-styled HTML
 * instead of loading a URL. Subclasses only supply their identity and style.
 */
export abstract class HtmlChannelRenderer implements ChannelRenderer {
	abstract readonly id: string;
	abstract readonly label: string;
	readonly needsServer = false;
	protected abstract readonly style: ChannelStyle;

	private context: ChannelPreviewContext | null = null;

	async mount(context: ChannelPreviewContext): Promise<() => void> {
		this.context = context;
		await this.render();
		return () => {
			this.context = null;
		};
	}

	async refresh(): Promise<void> {
		await this.render();
	}

	/** Read the note, convert it, and inject the styled article. */
	private async render(): Promise<void> {
		const context = this.context;
		if (!context) return;

		const source = await readNoteSource(context.plugin.app, context.file);
		const article = renderChannelArticle(source.body, this.style);

		context.container.empty();
		const wrapper = context.container.createDiv({ cls: 'channel-preview-wrap' });
		// Insert as parsed nodes rather than assigning `innerHTML`, so the raw
		// string is never a DOM sink (markdown-it already escapes HTML anyway).
		const parsed = new DOMParser().parseFromString(article, 'text/html');
		wrapper.append(...Array.from(parsed.body.children));
	}
}
