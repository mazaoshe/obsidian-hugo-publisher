import { Plugin } from 'obsidian';
import { registerCommands } from './commands';
import { PreviewServer } from './core/hugo';
import {
	DEFAULT_SETTINGS,
	HugoPublisherSettingTab,
	type HugoPublisherSettings,
} from './settings';
import { HUGO_PREVIEW_VIEW_TYPE, HugoPreviewView, activatePreviewView } from './ui/preview-view';

/**
 * Entry point for the Hugo Publisher plugin.
 *
 * The class only handles plugin lifecycle: loading settings, wiring up the
 * ribbon, commands and settings tab, and owning the preview process so it can be
 * cleaned up on unload. All feature logic lives in `commands/` and `core/`.
 */
export default class HugoPublisherPlugin extends Plugin {
	/** Current settings, replaced by `loadSettings`. */
	settings!: HugoPublisherSettings;

	/** Long-running `hugo server` process shared by the preview commands. */
	readonly preview = new PreviewServer();

	private statusBarEl: HTMLElement | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new HugoPublisherSettingTab(this.app, this));

		this.statusBarEl = this.addStatusBarItem();
		this.updateStatusBar();

		this.addRibbonIcon('globe', '打开 Hugo 预览', () => {
			void activatePreviewView(this);
		});

		this.registerView(
			HUGO_PREVIEW_VIEW_TYPE,
			(leaf) => new HugoPreviewView(leaf, this),
		);

		// Make sure the preview process never outlives the plugin.
		this.register(() => this.preview.stop());
		// Belt and suspenders: also stop it when the window is closing, in case
		// plugin unload does not run before the app tears down.
		this.registerDomEvent(window, 'beforeunload', () => this.preview.stop());

		registerCommands(this);
	}

	/** Load persisted settings, layered over the defaults. */
	async loadSettings(): Promise<void> {
		const stored = (await this.loadData()) as Partial<HugoPublisherSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, stored ?? {});
	}

	/** Persist the current settings. */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/** Refresh the status bar text from the current preview state. */
	updateStatusBar(): void {
		this.statusBarEl?.setText(
			this.preview.isRunning() ? 'Hugo 预览：运行中' : 'Hugo 预览：已停止',
		);
	}

	/** Re-render open preview views after the enabled channels change. */
	refreshChannels(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(HUGO_PREVIEW_VIEW_TYPE)) {
			if (leaf.view instanceof HugoPreviewView) {
				leaf.view.onChannelsChanged();
			}
		}
	}
}
