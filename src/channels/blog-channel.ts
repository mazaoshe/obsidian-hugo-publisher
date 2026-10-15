import type { ChannelPreviewContext, ChannelRenderer } from './types';

/**
 * Blog channel: an iframe pointed at the running Hugo server.
 *
 * Hugo injects a live-reload script into every page it serves, so once the
 * iframe is pointed at a post URL it keeps itself up to date. `refresh()` only
 * forces a reload for the rare case where the server restarted.
 */
export class BlogChannelRenderer implements ChannelRenderer {
	readonly id = 'blog';
	readonly label = '博客';
	readonly needsServer = true;

	private frame: HTMLIFrameElement | null = null;

	async mount(context: ChannelPreviewContext): Promise<() => void> {
		const frame = context.container.createEl('iframe', {
			cls: 'hugo-preview-frame',
		});
		this.frame = frame;
		frame.src = context.url;

		return () => {
			this.frame = null;
		};
	}

	async refresh(): Promise<void> {
		const frame = this.frame;
		if (!frame) return;

		// Re-assigning to an empty value first guarantees a reload even when the
		// URL has not changed.
		const url = frame.src;
		frame.src = '';
		frame.src = url;
	}
}
