import { Notice, type TFile } from 'obsidian';
import type HugoPublisherPlugin from '../main';
import { readNoteSource } from '../core/note';
import {
	renderChannelArticle,
	TOUTIAO_STYLE,
	WECHAT_STYLE,
	type ChannelStyle,
} from '../core/markdown-html';

/** Write rich text to the clipboard so pasting preserves formatting. */
async function copyRichHtml(html: string, plain: string): Promise<void> {
	await navigator.clipboard.write([
		new ClipboardItem({
			'text/html': new Blob([html], { type: 'text/html' }),
			'text/plain': new Blob([plain], { type: 'text/plain' }),
		}),
	]);
}

/** Plain text version of an HTML string, for the `text/plain` clipboard slot. */
function htmlToPlainText(html: string): string {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return (doc.body.textContent ?? '').trim();
}

/**
 * Render a note as a channel article and copy it to the clipboard.
 *
 * This only touches the clipboard; it never writes to disk or publishes.
 */
async function copyFileAsChannel(
	plugin: HugoPublisherPlugin,
	file: TFile,
	style: ChannelStyle,
	label: string,
): Promise<void> {
	const source = await readNoteSource(plugin.app, file);
	const html = renderChannelArticle(source.body, style);
	const plain = htmlToPlainText(html);

	try {
		await copyRichHtml(html, plain);
		new Notice(`已复制为 ${label} HTML，粘贴到 ${label} 编辑器即可。`, 5000);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('[hugo-publisher] copy', error);
		new Notice(`复制失败：${message}`, 8000);
	}
}

/** The Markdown note currently open in the editor, or `null`. */
function activeMarkdownFile(plugin: HugoPublisherPlugin): TFile | null {
	const file = plugin.app.workspace.getActiveFile();
	return file && file.extension === 'md' ? file : null;
}

/** Copy the active note as WeChat-styled HTML. */
export async function copyAsWechatHtml(plugin: HugoPublisherPlugin): Promise<void> {
	const file = activeMarkdownFile(plugin);
	if (!file) {
		new Notice('请先打开一篇 Markdown 笔记。');
		return;
	}
	await copyFileAsChannel(plugin, file, WECHAT_STYLE, '公众号');
}

/** Copy the active note as Toutiao-styled HTML. */
export async function copyAsToutiaoHtml(plugin: HugoPublisherPlugin): Promise<void> {
	const file = activeMarkdownFile(plugin);
	if (!file) {
		new Notice('请先打开一篇 Markdown 笔记。');
		return;
	}
	await copyFileAsChannel(plugin, file, TOUTIAO_STYLE, '头条');
}

/** Copy a specific note as WeChat-styled HTML (used by the preview toolbar). */
export async function copyFileAsWechatHtml(
	plugin: HugoPublisherPlugin,
	file: TFile,
): Promise<void> {
	await copyFileAsChannel(plugin, file, WECHAT_STYLE, '公众号');
}

/** Copy a specific note as Toutiao-styled HTML (used by the preview toolbar). */
export async function copyFileAsToutiaoHtml(
	plugin: HugoPublisherPlugin,
	file: TFile,
): Promise<void> {
	await copyFileAsChannel(plugin, file, TOUTIAO_STYLE, '头条');
}
