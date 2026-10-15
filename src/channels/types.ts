import type { TFile } from 'obsidian';
import type HugoPublisherPlugin from '../main';

/** Everything a channel renderer needs to draw one note preview. */
export interface ChannelPreviewContext {
	plugin: HugoPublisherPlugin;
	/** The note being previewed. */
	file: TFile;
	/** Full URL the renderer should load (used by the blog channel). */
	url: string;
	/** Empty element the renderer should fill. */
	container: HTMLElement;
}

/**
 * A renderer that previews one publishing channel inside the sidebar.
 *
 * The blog channel embeds the running Hugo server; future channels (WeChat,
 * Toutiao, Zhihu) will render the note through their own HTML templates instead.
 * The view only knows this interface, so adding a channel means adding a
 * renderer, not changing the view.
 */
export interface ChannelRenderer {
	/** Stable channel id, e.g. `blog`. */
	readonly id: string;
	/** Label shown in the channel dropdown. */
	readonly label: string;
	/** Whether previewing this channel needs the Hugo server and a slug. */
	readonly needsServer: boolean;
	/**
	 * Prepare the channel to preview `file`.
	 *
	 * @returns A cleanup function called when the view unmounts or switches
	 *   channel. The view empties the container itself; the cleanup should only
	 *   release resources such as listeners or processes.
	 */
	mount(context: ChannelPreviewContext): Promise<() => void>;
	/** Re-render after the source note changes. The blog channel is a no-op. */
	refresh(): Promise<void>;
}
