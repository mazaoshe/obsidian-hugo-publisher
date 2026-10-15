import { App, Modal, Notice, Setting } from 'obsidian';

/** Reduce user input to the lowercase, hyphenated shape used by existing slugs. */
function normalizeSlug(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Modal that asks for the post slug.
 *
 * The site permalink is `:slug`, so every published post needs one. The value is
 * normalised to lowercase ASCII with hyphens before it is returned.
 */
class SlugModal extends Modal {
	private value: string;
	private resolved = false;

	constructor(
		app: App,
		initialValue: string,
		private readonly onSubmit: (slug: string | null) => void,
	) {
		super(app);
		this.value = initialValue;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: 'Hugo 文章的 slug' });
		contentEl.createEl('p', {
			text: '文章 URL 使用 slug，例如 /mac-terminal-ghostty/。',
		});

		new Setting(contentEl).setName('Slug').addText((text) => {
			text.setValue(this.value).onChange((value) => {
				this.value = value;
			});
			text.inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					this.submit();
				}
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
		});

		new Setting(contentEl)
			.addButton((button) =>
				button.setButtonText('取消').onClick(() => this.close()),
			)
			.addButton((button) =>
				button
					.setButtonText('继续')
					.setCta()
					.onClick(() => this.submit()),
			);
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.resolved) this.onSubmit(null);
	}

	private submit(): void {
		const slug = normalizeSlug(this.value);
		if (slug === '') {
			new Notice('请输入小写字母、数字和连字符组成的 slug。');
			return;
		}

		this.resolved = true;
		this.onSubmit(slug);
		this.close();
	}
}

/**
 * Ask the user for a slug.
 *
 * @returns The normalised slug, or `null` when the dialog was dismissed.
 */
export function promptForSlug(app: App, initialValue = ''): Promise<string | null> {
	return new Promise((resolve) => {
		new SlugModal(app, initialValue, resolve).open();
	});
}
