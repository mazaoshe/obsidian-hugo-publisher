import { HtmlChannelRenderer } from './html-channel';
import { TOUTIAO_STYLE } from '../core/markdown-html';

/** Toutiao channel: renders the note as a Toutiao-styled article. */
export class ToutiaoChannelRenderer extends HtmlChannelRenderer {
	readonly id = 'toutiao';
	readonly label = '头条';
	protected readonly style = TOUTIAO_STYLE;
}
