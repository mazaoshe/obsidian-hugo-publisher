import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { markdownToHtml } from '../src/core/markdown-html.ts';

describe('markdownToHtml', () => {
	it('renders headings, emphasis and lists', () => {
		const html = markdownToHtml('# 标题\n\n**加粗** 和 *斜体*\n\n- 一\n- 二');
		assert.match(html, /<h1>标题<\/h1>/);
		assert.match(html, /<strong>加粗<\/strong>/);
		assert.match(html, /<em>斜体<\/em>/);
		assert.match(html, /<li>一<\/li>/);
	});

	it('renders fenced code blocks and inline code', () => {
		const html = markdownToHtml('`x = 1`\n\n```js\nconsole.log(1)\n```');
		assert.match(html, /<code>x = 1<\/code>/);
		assert.match(html, /<pre><code class="language-js">/);
	});

	it('auto-links bare URLs and escapes raw HTML', () => {
		const html = markdownToHtml('看 https://example.com 和 <script>alert(1)</script>');
		assert.match(html, /<a href="https:\/\/example\.com">/);
		assert.ok(!html.includes('<script>'));
	});
});
