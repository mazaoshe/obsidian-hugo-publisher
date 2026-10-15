import { App, PluginSettingTab, Setting } from 'obsidian';
import type HugoPublisherPlugin from './main';

/** User-configurable paths and behaviour for the publish pipeline. */
export interface HugoPublisherSettings {
	/** Absolute path to the Hugo project root. */
	hugoProjectRoot: string;
	/** Post directory inside the project, relative to the root. */
	contentSubdir: string;
	/** Vault folder whose notes may be published. */
	sourceFolder: string;
	/** Absolute path to the Hugo binary. */
	hugoPath: string;
	/** Absolute path to the git binary. */
	gitPath: string;
	/** Extra directories prepended to `PATH` for child processes. */
	extraPath: string;
	/** Local port used by `hugo server`. */
	previewPort: number;
	/** Open the preview URL in the default browser once Hugo is ready. */
	openPreviewInBrowser: boolean;
	/** Start `hugo server` automatically when the preview view opens. */
	autoStartPreview: boolean;
	/** Milliseconds to wait after the last keystroke before syncing the preview. */
	previewDebounceMs: number;
	/** Enable the WeChat channel in the preview sidebar. */
	enableWechat: boolean;
	/** Enable the Toutiao channel in the preview sidebar. */
	enableToutiao: boolean;
	/** Enable the blog (Hugo) channel in the preview sidebar. */
	enableBlog: boolean;
	/** How publishing pushes to the live site. */
	publishMethod: 'git' | 'script';
	/** Absolute path to the publish script, used when publishMethod is 'script'. */
	publishScript: string;
	/** Run a full Hugo build before committing, to catch broken content. */
	buildBeforePublish: boolean;
	/** Route `git push` through the proxy below. */
	useProxy: boolean;
	/** HTTP proxy used for `git push`. */
	proxyUrl: string;
	/** Git remote to push to. */
	gitRemote: string;
	/** Git branch to push to. */
	gitBranch: string;
}

export const DEFAULT_SETTINGS: HugoPublisherSettings = {
	hugoProjectRoot: '/Volumes/KeSilentA/Projects/20-personal/my-site/ypplog',
	contentSubdir: 'content/posts',
	sourceFolder: 'Content',
	hugoPath: '/opt/homebrew/bin/hugo',
	gitPath: '/usr/bin/git',
	extraPath: '/opt/homebrew/bin:/usr/local/bin',
	previewPort: 1313,
	openPreviewInBrowser: true,
	autoStartPreview: true,
	previewDebounceMs: 700,
	enableWechat: true,
	enableToutiao: true,
	enableBlog: true,
	publishMethod: 'git',
	publishScript: '/Volumes/KeSilentA/Projects/20-personal/my-site/ypplog/deploy.sh',
	buildBeforePublish: true,
	useProxy: true,
	proxyUrl: 'http://127.0.0.1:7897',
	gitRemote: 'origin',
	gitBranch: 'main',
};

/** Settings UI for the plugin. */
export class HugoPublisherSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: HugoPublisherPlugin) {
		super(app, plugin);
	}

	display(): void {
		this.render();
	}

	/** Render the settings UI. */
	private render(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('渠道').setHeading();
		containerEl.createEl('p', {
			text: '只有开启的渠道会显示为预览侧栏的标签页。',
		});
		this.addChannelToggle('启用公众号渠道', '在预览侧栏显示「公众号」标签页。', 'enableWechat');
		this.addChannelToggle('启用头条渠道', '在预览侧栏显示「头条」标签页。', 'enableToutiao');
		this.addChannelToggle('启用博客渠道', '在预览侧栏显示 Hugo 博客标签页。', 'enableBlog');

		new Setting(containerEl).setName('路径').setHeading();
		containerEl.createEl('p', {
			text: 'Obsidian 不继承 shell 的 PATH，所以 Hugo 和 Git 请使用绝对路径。',
		});

		this.addText('Hugo 项目根目录', '包含 hugo.yml 的文件夹。', 'hugoProjectRoot');
		this.addText('内容子目录', '文章目录，相对于项目根目录。', 'contentSubdir');
		this.addText('库源文件夹', '只有该文件夹内的笔记可以发布。', 'sourceFolder');
		this.addText('Hugo 可执行文件', 'hugo 可执行文件的绝对路径。', 'hugoPath');
		this.addText('Git 可执行文件', 'git 可执行文件的绝对路径。', 'gitPath');
		this.addText('额外 PATH 目录', '以冒号分隔，会加到子进程的 PATH 前面。', 'extraPath');

		new Setting(containerEl).setName('预览').setHeading();

		new Setting(containerEl)
			.setName('预览端口')
			.setDesc('Hugo server 使用的本地端口。')
			.addText((text) =>
				text.setValue(String(this.plugin.settings.previewPort)).onChange(async (value) => {
					const port = Number.parseInt(value, 10);
					if (Number.isInteger(port) && port > 0 && port < 65536) {
						this.plugin.settings.previewPort = port;
						await this.plugin.saveSettings();
					}
				}),
			);

		this.addToggle(
			'在浏览器打开预览',
			'Hugo 就绪后自动在浏览器打开预览地址。',
			'openPreviewInBrowser',
		);
		this.addToggle(
			'自动启动预览服务',
			'打开预览视图时自动启动 hugo server。',
			'autoStartPreview',
		);

		new Setting(containerEl)
			.setName('预览同步延迟')
			.setDesc('停止输入后等待多少毫秒再同步预览。')
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.previewDebounceMs))
					.onChange(async (value) => {
						const ms = Number.parseInt(value, 10);
						if (Number.isInteger(ms) && ms >= 0) {
							this.plugin.settings.previewDebounceMs = ms;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl).setName('发布').setHeading();

		new Setting(containerEl)
			.setName('发布方式')
			.setDesc('发布到线上时执行的操作。')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('git', '内置 Git 提交')
					.addOption('script', '调用发布脚本')
					.setValue(this.plugin.settings.publishMethod)
					.onChange(async (value) => {
						this.plugin.settings.publishMethod = value as 'git' | 'script';
						await this.plugin.saveSettings();
						this.render();
					}),
			);

		this.addToggle(
			'发布前先构建',
			'发布前先完整构建一次 Hugo，失败则中止。',
			'buildBeforePublish',
		);

		if (this.plugin.settings.publishMethod === 'script') {
			this.addText('发布脚本路径', '选择「调用发布脚本」时执行的脚本。', 'publishScript');
		} else {
			this.addToggle(
				'git push 使用代理',
				'为 git push 设置 HTTPS_PROXY。没有代理时请关闭。',
				'useProxy',
			);
			this.addText('代理地址', '仅当上面的代理选项开启时使用。', 'proxyUrl');
			this.addText('Git 远程', '要推送到的远程仓库名。', 'gitRemote');
			this.addText('Git 分支', '要推送到的分支。', 'gitBranch');
		}
	}

	/** Add a text setting bound to a string field. */
	private addText(
		name: string,
		desc: string,
		key: 'hugoProjectRoot' | 'contentSubdir' | 'sourceFolder' | 'hugoPath' | 'gitPath' | 'extraPath' | 'proxyUrl' | 'gitRemote' | 'gitBranch' | 'publishScript',
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) =>
				text.setValue(this.plugin.settings[key]).onChange(async (value) => {
					this.plugin.settings[key] = value.trim();
					await this.plugin.saveSettings();
				}),
			);
	}

	/** Add a toggle setting bound to a boolean field. */
	private addToggle(
		name: string,
		desc: string,
		key: 'openPreviewInBrowser' | 'buildBeforePublish' | 'useProxy' | 'autoStartPreview',
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings[key]).onChange(async (value) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
				}),
			);
	}

	/** Add a channel toggle that also refreshes open preview views. */
	private addChannelToggle(
		name: string,
		desc: string,
		key: 'enableWechat' | 'enableToutiao' | 'enableBlog',
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings[key]).onChange(async (value) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
					this.plugin.refreshChannels();
				}),
			);
	}
}
