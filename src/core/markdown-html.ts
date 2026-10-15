import MarkdownIt from 'markdown-it';

/**
 * Markdown → HTML rendering for the non-blog channels (WeChat, Toutiao).
 *
 * markdown-it is used instead of Obsidian's own renderer because these editors
 * need clean, inline-styled HTML: WeChat and Toutiao strip class names and
 * `<style>` blocks, so every style is applied as a `style=""` attribute. Raw
 * HTML in the note is escaped (`html: false`) for safety.
 */
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: false });

/** Convert a Markdown body to semantic HTML. */
export function markdownToHtml(source: string): string {
	return markdown.render(source);
}

/** Per-element inline CSS plus the base article styles for one channel. */
export interface ChannelStyle {
	/** CSS for the wrapping `<section>`. */
	base: string;
	/** CSS per element tag name. */
	tags: Record<string, string>;
	/** CSS for inline `<code>`. */
	inlineCode: string;
	/** CSS for `<code>` inside a fenced code block. */
	blockCodeText: string;
}

const BASE_FONT =
	'-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
const MONO_FONT = '"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace';

/**
 * Build a clean, readable article style around one accent colour.
 *
 * @param accent - Hex accent colour for headings and links.
 * @param accentRgb - The same colour as `r,g,b` for rgba borders.
 */
function buildStyle(accent: string, accentRgb: string): ChannelStyle {
	return {
		base:
			`background:#ffffff;color:#1f2328;font-family:${BASE_FONT};` +
			'font-size:16px;line-height:1.75;word-break:break-word;padding:24px 20px;',
		tags: {
			h2:
				`font-size:1.35em;font-weight:700;color:#1a1a1a;margin:1.4em 0 0.6em;` +
				`padding-left:12px;border-left:4px solid ${accent};line-height:1.4;`,
			h3: 'font-size:1.15em;font-weight:700;color:#1a1a1a;margin:1.2em 0 0.5em;line-height:1.4;',
			h4: 'font-weight:700;color:#1a1a1a;margin:1em 0 0.4em;',
			p: 'margin:0 0 1em;line-height:1.75;',
			strong: 'font-weight:700;color:#1a1a1a;',
			em: 'font-style:italic;',
			a: `color:${accent};text-decoration:none;border-bottom:1px solid rgba(${accentRgb},0.35);`,
			blockquote:
				'margin:1em 0;padding:0.8em 1em;background:#f6f8fa;' +
				'border-left:4px solid #d0d7de;color:#57606a;',
			pre: 'margin:1em 0;padding:14px 16px;background:#282c34;border-radius:8px;overflow-x:auto;line-height:1.6;font-size:13px;',
			ul: 'margin:0.8em 0;padding-left:1.6em;',
			ol: 'margin:0.8em 0;padding-left:1.6em;',
			li: 'margin:0.4em 0;line-height:1.75;',
			hr: 'border:none;border-top:1px solid #e5e7eb;margin:1.6em 0;',
			img: 'max-width:100%;border-radius:6px;display:block;margin:1em auto;',
		},
		inlineCode:
			`font-family:${MONO_FONT};background:#f0f1f3;color:#24292f;` +
			'padding:2px 6px;border-radius:4px;font-size:0.9em;',
		blockCodeText: `font-family:${MONO_FONT};background:transparent;color:#e6e6e6;`,
	};
}

/**
 * WeChat style: MWeb "Indigo" theme, reproduced as inline styles.
 *
 * Source: imageslr/mweb-themes `mweb-indigo.scss`. Three details are
 * intentionally dropped because they cannot survive inline styling or WeChat's
 * paste sanitisation: the 「」 pseudo-element brackets around bold text, the
 * dotted paper background, and the macOS traffic-light bar above code blocks.
 */
export const WECHAT_STYLE: ChannelStyle = {
	base:
		'background-color:#ffffff;' +
		'background-image:linear-gradient(90deg,rgba(60,10,30,0.05) 3%,transparent 0),' +
		'linear-gradient(1turn,rgba(60,10,30,0.05) 3%,transparent 0);' +
		'background-size:20px 20px;background-position:50%;' +
		`color:#595959;font-family:${BASE_FONT};font-size:16px;line-height:1.8;` +
		'word-break:break-word;padding:24px 20px;',
	tags: {
		h1: 'font-weight:500;border-left:6px solid #5a67d8;border-bottom:1px solid #eaecef;padding:0.25rem 0.25rem 0.25rem 0.75rem;margin:1.2em 0 16px;line-height:1.25;',
		h2: 'font-weight:500;border-left:6px solid #5a67d8;border-bottom:1px solid #eaecef;padding:0.25rem 0.25rem 0.25rem 0.75rem;margin:1.2em 0 16px;line-height:1.25;',
		h3: 'font-weight:700;margin:1em 0 16px;line-height:1.25;',
		h4: 'font-weight:700;margin:1em 0 16px;line-height:1.25;',
		h5: 'font-weight:700;margin:1em 0 16px;line-height:1.25;',
		h6: 'font-weight:700;margin:1em 0 16px;line-height:1.25;',
		p: 'margin:0 0 1rem;',
		strong: 'font-weight:bold;color:#5a67d8;',
		em: 'font-style:italic;',
		a: 'color:#5a67d8;text-decoration:none;border-bottom:1px solid #7f9cf5;font-weight:500;',
		blockquote:
			'margin:0 0 1rem;padding:0.5rem 1rem;background:#ebf4ff;' +
			'border-left:0.25em solid #7f9cf5;color:#667eea;',
		pre: 'margin:0 0 1rem;padding:1em;background:#272822;color:#f8f8f2;border-radius:6px;overflow-x:auto;line-height:1.5;',
		ul: 'margin:0 0 1rem;padding-left:2em;',
		ol: 'margin:0 0 1rem;padding-left:2em;',
		li: 'margin:0.2em 0;',
		hr: 'border:none;border-top:1px solid #eaecef;margin:1.5em 0;',
		img: 'max-width:100%;display:block;margin:10px auto;border-radius:6px;box-shadow:2px 4px 7px #999;',
	},
	inlineCode:
		`font-family:${MONO_FONT};color:#5a67d8;background:#ebf4ff;` +
		'font-weight:500;padding:0.1em 0.3em;border-radius:3px;',
	blockCodeText:
		`font-family:${MONO_FONT};color:#f8f8f2;background:none;` +
		'font-weight:400;line-height:1.6;',
};

/** Toutiao style: clean layout with a teal accent for distinction. */
export const TOUTIAO_STYLE: ChannelStyle = buildStyle('#0f7c8a', '15,124,138');

/**
 * Apply a channel's inline styles to every element of rendered HTML.
 *
 * A DOM walker is used so fenced code blocks can be distinguished from inline
 * code: `<code>` inside `<pre>` gets the block style, standalone `<code>` gets
 * the inline style.
 */
function applyInlineStyles(html: string, style: ChannelStyle): string {
	const doc = new DOMParser().parseFromString(
		`<!doctype html><body>${html}</body>`,
		'text/html',
	);

	const walk = (element: Element): void => {
		const tag = element.tagName.toLowerCase();
		if (tag === 'code') {
			const inPre = element.parentElement?.tagName.toLowerCase() === 'pre';
			element.setAttribute('style', inPre ? style.blockCodeText : style.inlineCode);
		} else {
			const css = style.tags[tag];
			if (css) element.setAttribute('style', css);
		}

		for (const child of Array.from(element.children)) walk(child);
	};

	for (const child of Array.from(doc.body.children)) walk(child);
	return doc.body.innerHTML;
}

/**
 * Render a Markdown body as a full, inline-styled article for a channel.
 *
 * The same string is used for the sidebar preview and the clipboard, so what
 * the author sees is exactly what gets pasted.
 */
export function renderChannelArticle(markdownSource: string, style: ChannelStyle): string {
	const styled = applyInlineStyles(markdownToHtml(markdownSource), style);
	return `<section style="${style.base}">${styled}</section>`;
}
