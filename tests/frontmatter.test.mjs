import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	composeNote,
	formatLocalIso,
	resolveTitle,
	splitNote,
	transformFrontmatter,
	PUBLISH_FIELD_ORDER,
} from '../src/core/frontmatter.ts';
import { toPostFileName } from '../src/utils/paths.ts';

const NOW = '2026-10-14T16:30:00+08:00';

/** Baseline context used by most transform tests. */
function context(overrides = {}) {
	return { now: NOW, fallbackTitle: 'Untitled note', draft: true, ...overrides };
}

describe('splitNote', () => {
	it('separates frontmatter from the body', () => {
		const parts = splitNote('---\ntitle: Hello\ntags: [a]\n---\n\nBody text\n');
		assert.equal(parts.frontmatterText, 'title: Hello\ntags: [a]');
		assert.equal(parts.body, '\nBody text\n');
	});

	it('treats a note without frontmatter as pure body', () => {
		const parts = splitNote('# Heading\n');
		assert.equal(parts.frontmatterText, null);
		assert.equal(parts.body, '# Heading\n');
	});

	it('ignores a leading byte order mark', () => {
		const parts = splitNote('\uFEFF---\ntitle: Hello\n---\nBody\n');
		assert.equal(parts.frontmatterText, 'title: Hello');
		assert.equal(parts.body, 'Body\n');
	});
});

describe('composeNote', () => {
	it('wraps frontmatter in fences and keeps the body', () => {
		const text = composeNote('title: Hello', '\nBody\n');
		assert.equal(text, '---\ntitle: Hello\n---\n\nBody\n');
	});
});

describe('transformFrontmatter', () => {
	it('drops knowledge-base fields', () => {
		const result = transformFrontmatter(
			{
				title: 'Hello',
				type: 'blog',
				status: 'draft',
				related: ['Other'],
				content_role: 'master',
				content_package: 'demo',
				channel: 'blog',
				published_url: 'https://example.com',
			},
			context(),
		);

		for (const key of Object.keys(result)) {
			assert.ok(
				!['type', 'status', 'related', 'content_role', 'content_package', 'channel', 'published_url'].includes(key),
				`${key} should not survive the transform`,
			);
		}
	});

	it('fills publish defaults when the note is bare', () => {
		const result = transformFrontmatter({ title: 'Hello' }, context());

		assert.equal(result.title, 'Hello');
		assert.equal(result.date, NOW);
		assert.equal(result.lastmod, NOW);
		assert.equal(result.draft, true);
		assert.equal(result.lang, 'zh-cn');
		assert.deepEqual(result.tags, []);
		assert.deepEqual(result.categories, []);
		assert.deepEqual(result.keywords, []);
		assert.equal(result.featured, false);
		assert.equal(result.hot, false);
		assert.equal(result['schema-type'], 'TechArticle');
		assert.equal(result['schema-headline'], 'Hello');
		assert.ok(!('description' in result));
		assert.ok(!('cover' in result));
		assert.ok(!('slug' in result));
	});

	it('keeps values the author already set', () => {
		const result = transformFrontmatter(
			{
				title: 'Hello',
				date: '2026-01-02T03:04:05+08:00',
				tags: ['AI', ' Obsidian '],
				categories: '工具效率',
				description: 'A summary.',
				cover: 'https://example.com/cover.webp',
				featured: true,
				hot: 'false',
				'schema-type': 'BlogPosting',
				'schema-headline': 'Custom headline',
			},
			context({ draft: false }),
		);

		assert.equal(result.date, '2026-01-02T03:04:05+08:00');
		assert.deepEqual(result.tags, ['AI', 'Obsidian']);
		assert.deepEqual(result.categories, ['工具效率']);
		assert.equal(result.description, 'A summary.');
		assert.equal(result.cover, 'https://example.com/cover.webp');
		assert.equal(result.featured, true);
		assert.equal(result.hot, false);
		assert.equal(result.draft, false);
		assert.equal(result['schema-type'], 'BlogPosting');
		assert.equal(result['schema-headline'], 'Custom headline');
	});

	it('prefers the context slug and falls back to the title', () => {
		const withSource = transformFrontmatter({ title: 'Hello', slug: 'note-slug' }, context({ slug: 'given' }));
		assert.equal(withSource.slug, 'note-slug');

		const fromContext = transformFrontmatter({ title: 'Hello' }, context({ slug: 'given' }));
		assert.equal(fromContext.slug, 'given');
	});

	it('uses the fallback title when the note has none', () => {
		const result = transformFrontmatter({}, context({ fallbackTitle: 'My note' }));
		assert.equal(result.title, 'My note');
		assert.equal(result['schema-headline'], 'My note');
	});

	it('resolves the same title it writes', () => {
		assert.equal(resolveTitle({ title: 'Hello' }, 'Fallback'), 'Hello');
		assert.equal(resolveTitle({}, 'Fallback'), 'Fallback');
		assert.equal(resolveTitle({ title: '   ' }, 'Fallback'), 'Fallback');
	});

	it('emits fields in publish order', () => {
		const result = transformFrontmatter({ title: 'Hello', slug: 'hello' }, context());
		const ordered = Object.keys(result).filter((key) => PUBLISH_FIELD_ORDER.includes(key));
		assert.deepEqual(ordered, [
			'title',
			'slug',
			'date',
			'lastmod',
			'draft',
			'lang',
			'tags',
			'categories',
			'keywords',
			'featured',
			'hot',
			'schema-type',
			'schema-headline',
		]);
	});
});

describe('formatLocalIso', () => {
	it('produces an ISO timestamp with a numeric offset', () => {
		const formatted = formatLocalIso(new Date(2026, 9, 14, 16, 30, 0));
		assert.match(formatted, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
		assert.ok(formatted.startsWith('2026-10-14T16:30:00'));
	});

	it('normalises Date values inside frontmatter', () => {
		const result = transformFrontmatter({ title: 'Hello', date: new Date(2026, 9, 14, 16, 30, 0) }, context());
		assert.match(String(result.date), /^2026-10-14T16:30:00[+-]\d{2}:\d{2}$/);
	});
});

describe('toPostFileName', () => {
	it('keeps Chinese titles and normalises illegal characters', () => {
		assert.equal(toPostFileName('我为什么转向 Pi：把 AI 接入知识库'), '我为什么转向 Pi：把 AI 接入知识库.md');
		assert.equal(toPostFileName('A/B: test?'), 'A-B： test.md');
	});

	it('falls back to untitled when the title is empty', () => {
		assert.equal(toPostFileName('   '), 'untitled.md');
	});
});
