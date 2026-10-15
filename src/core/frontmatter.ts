import type { Frontmatter, PublishContext } from '../types';

/** Two-digit zero padding for date and time parts. */
function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

/**
 * Format a `Date` as an ISO 8601 string with the machine's local UTC offset.
 *
 * Blog frontmatter uses the `2026-10-14T16:30:00+08:00` shape, so the UTC-only
 * `Date#toISOString()` is not suitable here.
 */
export function formatLocalIso(date: Date): string {
	const offsetMinutes = -date.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? '+' : '-';
	const absolute = Math.abs(offsetMinutes);

	const year = date.getFullYear();
	const month = pad2(date.getMonth() + 1);
	const day = pad2(date.getDate());
	const hour = pad2(date.getHours());
	const minute = pad2(date.getMinutes());
	const second = pad2(date.getSeconds());

	return (
		`${year}-${month}-${day}T${hour}:${minute}:${second}` +
		`${sign}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`
	);
}

/**
 * Fields owned by the knowledge base. They describe how a piece of content is
 * organised in the vault and must never reach the Hugo content directory.
 */
export const KNOWLEDGE_ONLY_FIELDS: readonly string[] = [
	'type',
	'status',
	'related',
	'content_role',
	'content_package',
	'channel',
	'published_url',
];

/**
 * Field order of a written post, mirroring the blog project's own template so
 * that generated files stay diff-friendly.
 */
export const PUBLISH_FIELD_ORDER: readonly string[] = [
	'title',
	'slug',
	'date',
	'lastmod',
	'draft',
	'lang',
	'tags',
	'categories',
	'keywords',
	'description',
	'cover',
	'featured',
	'hot',
	'schema-type',
	'schema-headline',
];

/** The two halves of a Markdown file that may or may not start with frontmatter. */
export interface NoteParts {
	/** Raw YAML between the `---` fences, or `null` when there is none. */
	frontmatterText: string | null;
	/** Everything after the frontmatter block. */
	body: string;
}

/** Matches a leading `---` fenced YAML block and captures its contents. */
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Split a Markdown file into its frontmatter text and body.
 *
 * @param text - Full file contents.
 */
export function splitNote(text: string): NoteParts {
	const withoutBom = text.replace(/^\uFEFF/, '');
	const match = FRONTMATTER_PATTERN.exec(withoutBom);
	if (!match) {
		return { frontmatterText: null, body: withoutBom };
	}

	return {
		frontmatterText: match[1] ?? '',
		body: withoutBom.slice(match[0].length),
	};
}

/**
 * Reassemble a Markdown file from frontmatter text and body.
 *
 * @param frontmatterText - YAML without the `---` fences.
 * @param body - Markdown body.
 */
export function composeNote(frontmatterText: string, body: string): string {
	const trimmedFrontmatter = frontmatterText.trim();
	const trimmedBody = body.replace(/^\r?\n+/, '').replace(/\s+$/, '');
	return `---\n${trimmedFrontmatter}\n---\n\n${trimmedBody}\n`;
}

/** Read a YAML scalar as a non-empty trimmed string. */
function asString(value: unknown): string | undefined {
	if (value instanceof Date) return formatLocalIso(value);
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed === '' ? undefined : trimmed;
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value);
	}
	return undefined;
}

/** Read a YAML scalar or sequence as a list of non-empty strings. */
function asStringArray(value: unknown): string[] {
	const raw = Array.isArray(value) ? value : value == null ? [] : [value];
	return raw
		.filter((item): item is string => typeof item === 'string')
		.map((item) => item.trim())
		.filter((item) => item !== '');
}

/** Read a YAML boolean, accepting the quoted string forms YAML also allows. */
function asBoolean(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (value === 'true') return true;
	if (value === 'false') return false;
	return undefined;
}

/** Reorder fields to match {@link PUBLISH_FIELD_ORDER}, keeping leftovers last. */
function orderFields(values: Frontmatter): Frontmatter {
	const ordered: Frontmatter = {};
	const placed = new Set<string>();

	for (const key of PUBLISH_FIELD_ORDER) {
		if (key in values) {
			ordered[key] = values[key];
			placed.add(key);
		}
	}

	for (const [key, value] of Object.entries(values)) {
		if (!placed.has(key)) ordered[key] = value;
	}

	return ordered;
}

/**
 * Resolve the post title the same way {@link transformFrontmatter} does, so
 * callers can derive a file name that matches the written frontmatter.
 *
 * @param source - Frontmatter parsed from the source note.
 * @param fallbackTitle - Title used when the note defines none.
 */
export function resolveTitle(source: Frontmatter, fallbackTitle: string): string {
	return asString(source['title']) ?? fallbackTitle;
}

/**
 * Convert vault frontmatter into the frontmatter Hugo expects.
 *
 * Knowledge-base fields are dropped rather than copied, and publish fields keep
 * values the author already set. Missing values fall back to the blog template
 * defaults (`lang: zh-cn`, `schema-type: TechArticle`, …). `description` and
 * `cover` are omitted when empty so the theme never renders an empty image.
 *
 * @param source - Frontmatter parsed from the source note.
 * @param context - Publish-time values such as the timestamp and slug.
 * @returns A new frontmatter object in publish order.
 */
export function transformFrontmatter(
	source: Frontmatter,
	context: PublishContext,
): Frontmatter {
	const title = resolveTitle(source, context.fallbackTitle);
	const slug = asString(source['slug']) ?? context.slug;

	const values: Frontmatter = {
		title,
		date: asString(source['date']) ?? context.now,
		lastmod: context.now,
		draft: context.draft,
		lang: asString(source['lang']) ?? 'zh-cn',
		tags: asStringArray(source['tags']),
		categories: asStringArray(source['categories']),
		keywords: asStringArray(source['keywords']),
		featured: asBoolean(source['featured']) ?? false,
		hot: asBoolean(source['hot']) ?? false,
		'schema-type': asString(source['schema-type']) ?? 'TechArticle',
		'schema-headline': asString(source['schema-headline']) ?? title,
	};

	if (slug) values['slug'] = slug;

	const description = asString(source['description']);
	if (description) values['description'] = description;

	const cover = asString(source['cover']);
	if (cover) values['cover'] = cover;

	return orderFields(values);
}
