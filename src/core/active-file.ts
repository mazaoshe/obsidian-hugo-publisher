import type { TFile } from 'obsidian';
import type HugoPublisherPlugin from '../main';

/** Normalise a configured folder path for prefix comparisons. */
export function normalizeFolder(folder: string): string {
	return folder.replace(/^\/+|\/+$/g, '');
}

/**
 * The currently open Markdown note, but only when it lives in the configured
 * source folder.
 */
export function getActivePublishableFile(plugin: HugoPublisherPlugin): TFile | null {
	const file = plugin.app.workspace.getActiveFile();
	if (!file || file.extension !== 'md') return null;

	const folder = normalizeFolder(plugin.settings.sourceFolder);
	if (folder === '') return file;

	return file.path === folder || file.path.startsWith(`${folder}/`) ? file : null;
}
