import { existsSync } from 'node:fs';
import { Notice, type TFile } from 'obsidian';
import type HugoPublisherPlugin from '../main';
import { getActivePublishableFile } from '../core/active-file';
import { buildSite } from '../core/hugo';
import { commit, hasStagedChanges, push, stagePaths } from '../core/git';
import { gitOptions, hugoOptions } from '../core/options';
import { preparePost, writePost } from '../core/post';
import { confirmAction } from '../ui/confirm-modal';
import { runCommand, tail } from '../utils/process';
import { openExternalUrl } from '../utils/external';

/** Long enough to read a multi-line error without it disappearing. */
const ERROR_NOTICE_MS = 10_000;

/** Show an error to the user and keep the details in the developer console. */
function reportError(error: unknown): void {
	const message = error instanceof Error ? error.message : String(error);
	console.error('[hugo-publisher]', error);
	new Notice(message, ERROR_NOTICE_MS);
}

/**
 * Write a note into the Hugo content directory as a draft.
 *
 * The source note is never modified; the plugin only produces a publish-layer
 * copy with converted frontmatter.
 */
export async function syncFile(plugin: HugoPublisherPlugin, file: TFile): Promise<void> {
	try {
		const prepared = await preparePost(plugin, file, 'draft');
		if (!prepared) return;

		if (existsSync(prepared.targetPath)) {
			const overwrite = await confirmAction(
				plugin.app,
				'覆盖已有文章？',
				`${prepared.relativePath} 已存在于 Hugo 项目中。`,
				'覆盖',
			);
			if (!overwrite) return;
		}

		await writePost(prepared);
		new Notice(`已同步为草稿：${prepared.relativePath}`, 6000);
	} catch (error) {
		reportError(error);
	}
}

/**
 * Publish a note: write it with `draft: false`, optionally build the site, then
 * commit and push only that post.
 */
export async function publishFile(plugin: HugoPublisherPlugin, file: TFile): Promise<void> {
	try {
		const prepared = await preparePost(plugin, file, 'publish');
		if (!prepared) return;

		const confirmed = await confirmAction(
			plugin.app,
			'发布这篇文章？',
			`将写入 ${prepared.relativePath} 并推送到 ${plugin.settings.gitRemote}/${plugin.settings.gitBranch}。`,
			'发布',
		);
		if (!confirmed) return;

		await writePost(prepared);

		if (plugin.settings.buildBeforePublish) {
			new Notice('发布前正在构建站点…');
			const build = await buildSite(hugoOptions(plugin));
			if (build.code !== 0) {
				const detail = tail(build.stderr || build.stdout);
				new Notice(`Hugo 构建失败，未推送。\n${detail}`, ERROR_NOTICE_MS);
				return;
			}
		}

		if (plugin.settings.publishMethod === 'script') {
			await runPublishScript(plugin);
			return;
		}

		const git = gitOptions(plugin);
		await stagePaths(git, [prepared.relativePath]);
		if (!(await hasStagedChanges(git))) {
			new Notice('没有可发布的内容。');
			return;
		}

		await commit(git, `post: ${prepared.document.title}`);
		await push(git, plugin.settings.gitRemote, plugin.settings.gitBranch);
		new Notice(`已发布：${prepared.document.title}`, 6000);
	} catch (error) {
		reportError(error);
	}
}

/** Run the configured publish script to push the site live. */
async function runPublishScript(plugin: HugoPublisherPlugin): Promise<void> {
	const scriptPath = plugin.settings.publishScript.trim();
	if (scriptPath === '') {
		new Notice('请先在设置里填写发布脚本路径。');
		return;
	}

	const { projectRoot, env } = gitOptions(plugin);
	new Notice('正在调用发布脚本…');

	const result = await runCommand('/bin/bash', [scriptPath], {
		cwd: projectRoot,
		env,
		timeoutMs: 300_000,
	});

	if (result.code !== 0) {
		const detail = tail(result.stderr || result.stdout);
		new Notice(`发布脚本执行失败：\n${detail}`, ERROR_NOTICE_MS);
		return;
	}

	new Notice('发布脚本执行完成。', 6000);
}

/** Sync the note currently open in the editor. */
export async function syncCurrentNote(plugin: HugoPublisherPlugin): Promise<void> {
	const file = getActivePublishableFile(plugin);
	if (!file) {
		new Notice('请先打开源文件夹里的 Markdown 笔记。');
		return;
	}
	await syncFile(plugin, file);
}

/** Publish the note currently open in the editor. */
export async function publishCurrentNote(plugin: HugoPublisherPlugin): Promise<void> {
	const file = getActivePublishableFile(plugin);
	if (!file) {
		new Notice('请先打开源文件夹里的 Markdown 笔记。');
		return;
	}
	await publishFile(plugin, file);
}

/** Start the Hugo preview server and open it in the browser. */
export async function startPreview(plugin: HugoPublisherPlugin): Promise<void> {
	if (plugin.preview.isRunning()) {
		new Notice('预览服务已在运行。');
		return;
	}

	new Notice('正在启动 Hugo 预览…');
	try {
		const url = await plugin.preview.start(hugoOptions(plugin), plugin.settings.previewPort);
		plugin.updateStatusBar();
		new Notice(`预览已就绪：${url}`, 6000);
		if (plugin.settings.openPreviewInBrowser) await openExternalUrl(url);
	} catch (error) {
		plugin.updateStatusBar();
		reportError(error);
	}
}

/** Stop the Hugo preview server. */
export function stopPreview(plugin: HugoPublisherPlugin): void {
	if (!plugin.preview.isRunning()) {
		new Notice('没有正在运行的预览服务。');
		return;
	}

	plugin.preview.stop();
	plugin.updateStatusBar();
	new Notice('预览已停止。');
}
