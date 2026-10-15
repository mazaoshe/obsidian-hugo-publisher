import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Notice, type TFile } from 'obsidian';
import type HugoPublisherPlugin from '../main';
import { buildPublishDocument, parseFrontmatterText, readNoteSource } from './note';
import { formatLocalIso, resolveTitle } from './frontmatter';
import { promptForSlug } from '../ui/slug-modal';
import { relativePath, resolvePath, toPostFileName } from '../utils/paths';
import type { Frontmatter, NoteSource, PublishContext, PublishDocument } from '../types';

/** How the `draft` flag is decided for a written post. */
export type DraftMode = 'draft' | 'publish' | 'preserve';

/** Slug and target path resolved for a note. */
export interface ResolvedPost {
	/** Parsed frontmatter and body of the source note. */
	source: NoteSource;
	/** Title used for the file name. */
	title: string;
	/** Slug written into frontmatter and used in the URL. */
	slug: string;
	/** Absolute path inside the Hugo project. */
	targetPath: string;
}

/** A note rendered and located for writing into the Hugo project. */
export interface PreparedPost {
	document: PublishDocument;
	slug: string;
	/** Absolute path inside the Hugo project. */
	targetPath: string;
	/** Project-relative path, used as the git pathspec. */
	relativePath: string;
}

/** Read a frontmatter value as a non-empty string. */
function asNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
}

/** Read and parse the frontmatter of an existing target file, if it exists. */
async function readExistingFrontmatter(targetPath: string): Promise<Frontmatter | undefined> {
	if (!existsSync(targetPath)) return undefined;

	try {
		const text = await readFile(targetPath, 'utf8');
		return parseFrontmatterText(text);
	} catch {
		return undefined;
	}
}

/** Reuse the slug of an already-synced post so the user only types it once. */
async function readSlugFromTarget(targetPath: string): Promise<string | undefined> {
	const existing = await readExistingFrontmatter(targetPath);
	return asNonEmptyString(existing?.['slug']);
}

/** Decide the `draft` flag for the written post. */
async function resolveDraft(
	targetPath: string,
	mode: DraftMode,
): Promise<boolean> {
	if (mode === 'draft') return true;
	if (mode === 'publish') return false;

	// Preserve the existing flag so previewing never unpublishes a live post.
	const existing = await readExistingFrontmatter(targetPath);
	if (existing && typeof existing['draft'] === 'boolean') {
		return existing['draft'];
	}
	return true;
}

/**
 * Resolve the slug and target path for a note.
 *
 * The slug comes from the note's frontmatter, then from an already-synced post
 * with the same file name, then from a one-time prompt. Returns `null` when the
 * user dismisses the prompt.
 */
export async function resolvePost(
	plugin: HugoPublisherPlugin,
	file: TFile,
): Promise<ResolvedPost | null> {
	const source = await readNoteSource(plugin.app, file);
	const title = resolveTitle(source.frontmatter, file.basename);
	const targetPath = resolvePath(
		plugin.settings.hugoProjectRoot,
		plugin.settings.contentSubdir,
		toPostFileName(title),
	);

	let slug = asNonEmptyString(source.frontmatter['slug']) ?? (await readSlugFromTarget(targetPath));
	if (!slug) {
		slug = (await promptForSlug(plugin.app)) ?? undefined;
		if (!slug) {
			new Notice('已取消预览：需要 slug。');
			return null;
		}
	}

	return { source, title, slug, targetPath };
}

/**
 * Render a note into a Hugo post document.
 *
 * @returns The prepared post, or `null` when the user cancelled the slug prompt.
 */
export async function preparePost(
	plugin: HugoPublisherPlugin,
	file: TFile,
	draftMode: DraftMode,
): Promise<PreparedPost | null> {
	const resolved = await resolvePost(plugin, file);
	if (!resolved) return null;

	const draft = await resolveDraft(resolved.targetPath, draftMode);
	const context: PublishContext = {
		now: formatLocalIso(new Date()),
		fallbackTitle: file.basename,
		slug: resolved.slug,
		draft,
	};

	return {
		document: buildPublishDocument(resolved.source, context),
		slug: resolved.slug,
		targetPath: resolved.targetPath,
		relativePath: relativePath(plugin.settings.hugoProjectRoot, resolved.targetPath),
	};
}

/** Create the parent directory and write the post unconditionally. */
export async function writePost(prepared: PreparedPost): Promise<void> {
	await mkdir(path.dirname(prepared.targetPath), { recursive: true });
	await writeFile(prepared.targetPath, prepared.document.text, 'utf8');
}

/**
 * Write the post only when its content differs from what is already on disk.
 *
 * @returns `true` when the file was written, `false` when it was unchanged.
 */
export async function writePostIfChanged(prepared: PreparedPost): Promise<boolean> {
	try {
		const existing = await readFile(prepared.targetPath, 'utf8');
		if (existing === prepared.document.text) return false;
	} catch {
		// File does not exist yet or cannot be read: fall through and write.
	}

	await writePost(prepared);
	return true;
}
