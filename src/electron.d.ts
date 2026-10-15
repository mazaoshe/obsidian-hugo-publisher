/**
 * Minimal Electron surface used by the plugin.
 *
 * Obsidian runs inside Electron, but the type definitions are not part of the
 * `obsidian` package. Declaring only what we use keeps the type surface small
 * and avoids depending on the full Electron typings.
 */
declare module 'electron' {
	export const shell: {
		/** Open a URL with the user's default browser. */
		openExternal(url: string): Promise<void>;
		/** Open a local file or folder with the default application. */
		openPath(path: string): Promise<string>;
	};
}
