import { type App, type TFile, parseYaml, stringifyYaml } from 'obsidian';
import { composeNote, splitNote, transformFrontmatter } from './frontmatter';
import type { Frontmatter, NoteSource, PublishContext, PublishDocument } from '../types';
import { toPostFileName } from '../utils/paths';

/** Turn a `parseYaml` result into a plain object, rejecting scalars and lists. */
function asFrontmatter(value: unknown): Frontmatter {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Frontmatter;
}

/** Parse the frontmatter block of a Markdown string. */
export function parseFrontmatterText(text: string): Frontmatter {
	const { frontmatterText } = splitNote(text);
	if (frontmatterText === null) return {};

	try {
		return asFrontmatter(parseYaml(frontmatterText));
	} catch {
		return {};
	}
}

/**
 * Read a note from the vault and split it into parsed frontmatter and body.
 *
 * @param app - Obsidian application instance.
 * @param file - Note to read.
 */
export async function readNoteSource(app: App, file: TFile): Promise<NoteSource> {
	const raw = await app.vault.read(file);
	const { frontmatterText, body } = splitNote(raw);
	return {
		frontmatter: frontmatterText === null ? {} : asFrontmatter(parseYaml(frontmatterText)),
		body,
	};
}

/**
 * Render a note as a Hugo post.
 *
 * @param source - Frontmatter and body read from the source note.
 * @param context - Publish-time values such as the timestamp and slug.
 */
export function buildPublishDocument(
	source: NoteSource,
	context: PublishContext,
): PublishDocument {
	const frontmatter = transformFrontmatter(source.frontmatter, context);
	const frontmatterText = stringifyYaml(frontmatter).trim();
	const rawTitle = frontmatter['title'];
	const title =
		typeof rawTitle === 'string' && rawTitle.trim() !== ''
			? rawTitle
			: context.fallbackTitle;

	return {
		text: composeNote(frontmatterText, source.body),
		fileName: toPostFileName(title),
		title,
	};
}
