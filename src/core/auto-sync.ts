import { Notice, type TFile } from 'obsidian';
import type HugoPublisherPlugin from '../main';
import { preparePost, writePostIfChanged } from './post';

/**
 * Debounced writer that keeps the Hugo draft copy in step with the note.
 *
 * The preview view feeds it `vault.on('modify')` events for the bound note. It
 * waits for the user to pause typing, then rewrites the same file in
 * `content/posts/` (one file per note, overwritten in place) with `draft`
 * preserved, so previewing never changes a post's publication state.
 */
export class AutoSync {
	private timer: number | null = null;
	private currentFile: TFile | null = null;

	constructor(private readonly plugin: HugoPublisherPlugin) {}

	/** Schedule a debounced write for the previewed note. */
	schedule(file: TFile): void {
		this.currentFile = file;
		if (this.timer !== null) window.clearTimeout(this.timer);
		this.timer = window.setTimeout(() => {
			this.timer = null;
			void this.flush();
		}, this.plugin.settings.previewDebounceMs);
	}

	/** Write the previewed note immediately, if its content changed. */
	async flush(): Promise<void> {
		const file = this.currentFile;
		if (!file) return;

		try {
			const prepared = await preparePost(this.plugin, file, 'preserve');
			if (!prepared) return;
			await writePostIfChanged(prepared);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error('[hugo-publisher] auto-sync', error);
			new Notice(`预览同步失败：${message}`, 8000);
		}
	}

	/** Cancel a pending write. */
	cancel(): void {
		if (this.timer !== null) window.clearTimeout(this.timer);
		this.timer = null;
	}

	/** Release the timer and forget the bound file. */
	dispose(): void {
		this.cancel();
		this.currentFile = null;
	}
}
