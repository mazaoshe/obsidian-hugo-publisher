/**
 * Shared types for the Hugo Publisher plugin.
 *
 * Everything here is deliberately loose: frontmatter values come from user
 * notes, so a key can hold anything YAML allows.
 */

/** Parsed YAML frontmatter of a note. */
export type Frontmatter = Record<string, unknown>;

/** Inputs collected before a note is written into the Hugo content directory. */
export interface PublishContext {
	/** Timestamp used for the `date` fallback and for `lastmod`. */
	now: string;
	/** Title used when the note has no `title` field. */
	fallbackTitle: string;
	/** Slug supplied by the user when the note does not define one. */
	slug?: string;
	/** `true` while editing, `false` when the note is going live. */
	draft: boolean;
}

/** A note split into its parsed frontmatter and its Markdown body. */
export interface NoteSource {
	frontmatter: Frontmatter;
	body: string;
}

/** A document ready to be written into the Hugo content directory. */
export interface PublishDocument {
	/** Full file contents, frontmatter included. */
	text: string;
	/** File name derived from the title, including the `.md` extension. */
	fileName: string;
	/** Value written to the `title` field. */
	title: string;
}
