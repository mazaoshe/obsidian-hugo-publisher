import { shell } from 'electron';

/**
 * Open a URL in the user's default browser.
 *
 * Obsidian's own API has no cross-platform "open external" helper, so Electron's
 * `shell` module is used directly. Failures are swallowed because opening a
 * preview tab is a convenience, not a step the publish flow depends on.
 */
export async function openExternalUrl(url: string): Promise<void> {
	try {
		await shell.openExternal(url);
	} catch {
		// Ignore: the user can open the URL manually from the notice.
	}
}
