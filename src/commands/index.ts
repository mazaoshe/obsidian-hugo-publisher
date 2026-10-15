import type HugoPublisherPlugin from '../main';
import { getActivePublishableFile } from '../core/active-file';
import { activatePreviewView } from '../ui/preview-view';
import { copyAsToutiaoHtml, copyAsWechatHtml } from './export';
import {
	publishCurrentNote,
	startPreview,
	stopPreview,
	syncCurrentNote,
} from './actions';

/**
 * Register every command the plugin exposes.
 *
 * Command IDs are stable API: renaming one breaks user hotkeys, so they are
 * kept short and descriptive.
 */
export function registerCommands(plugin: HugoPublisherPlugin): void {
	plugin.addCommand({
		id: 'sync-current-note',
		name: '同步当前笔记到 Hugo',
		checkCallback: (checking: boolean) => {
			if (!getActivePublishableFile(plugin)) return false;
			if (!checking) void syncCurrentNote(plugin);
			return true;
		},
	});

	plugin.addCommand({
		id: 'start-preview',
		name: '启动预览',
		callback: () => {
			void startPreview(plugin);
		},
	});

	plugin.addCommand({
		id: 'stop-preview',
		name: '停止预览',
		callback: () => {
			stopPreview(plugin);
		},
	});

	plugin.addCommand({
		id: 'publish-current-note',
		name: '发布当前笔记',
		checkCallback: (checking: boolean) => {
			if (!getActivePublishableFile(plugin)) return false;
			if (!checking) void publishCurrentNote(plugin);
			return true;
		},
	});

	plugin.addCommand({
		id: 'open-preview-sidebar',
		name: '打开预览侧栏',
		callback: () => {
			void activatePreviewView(plugin);
		},
	});

	plugin.addCommand({
		id: 'copy-as-wechat-html',
		name: '复制为公众号 HTML',
		callback: () => {
			void copyAsWechatHtml(plugin);
		},
	});

	plugin.addCommand({
		id: 'copy-as-toutiao-html',
		name: '复制为头条 HTML',
		callback: () => {
			void copyAsToutiaoHtml(plugin);
		},
	});
}
