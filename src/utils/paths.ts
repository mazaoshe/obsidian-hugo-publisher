import path from 'node:path';

/**
 * Build a Markdown file name from a note title.
 *
 * Chinese titles are kept as-is (the blog already uses them), but characters
 * that are illegal in a file name are normalised: a colon becomes the fullwidth
 * `：` used by existing posts, path separators become hyphens, and the
 * remaining reserved characters are dropped.
 *
 * @param title - Raw note title.
 * @returns A file name including the `.md` extension.
 */
export function toPostFileName(title: string): string {
	const cleaned = title
		.replace(/:/g, '：')
		.replace(/[\\/]/g, '-')
		.replace(/[*?"<>|]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	return `${cleaned || 'untitled'}.md`;
}

/** Resolve a platform-absolute filesystem path from the given segments. */
export function resolvePath(...segments: string[]): string {
	return path.resolve(...segments);
}

/**
 * Express `target` relative to `root` using forward slashes.
 *
 * Git expects POSIX-style pathspecs even on Windows, and Obsidian always uses
 * forward slashes, so the separator is normalised here.
 */
export function relativePath(root: string, target: string): string {
	return path.relative(root, target).split(path.sep).join('/');
}
