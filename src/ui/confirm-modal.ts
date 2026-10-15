import { App, Modal, Setting } from 'obsidian';

/** Confirmation dialog with a primary and a cancel action. */
class ConfirmModal extends Modal {
	private resolved = false;

	constructor(
		app: App,
		private readonly title: string,
		private readonly message: string,
		private readonly confirmLabel: string,
		private readonly onResolve: (confirmed: boolean) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: this.title });
		contentEl.createEl('p', { text: this.message });

		new Setting(contentEl)
			.addButton((button) =>
				button.setButtonText('取消').onClick(() => this.close()),
			)
			.addButton((button) =>
				button
					.setButtonText(this.confirmLabel)
					.setCta()
					.onClick(() => {
						this.resolved = true;
						this.onResolve(true);
						this.close();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.resolved) this.onResolve(false);
	}
}

/**
 * Ask the user to confirm an action.
 *
 * @returns `true` when the primary button was chosen.
 */
export function confirmAction(
	app: App,
	title: string,
	message: string,
	confirmLabel = '继续',
): Promise<boolean> {
	return new Promise((resolve) => {
		new ConfirmModal(app, title, message, confirmLabel, resolve).open();
	});
}
