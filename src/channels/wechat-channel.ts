import { HtmlChannelRenderer } from './html-channel';
import { WECHAT_STYLE } from '../core/markdown-html';

/** WeChat channel: renders the note as a WeChat-styled article. */
export class WechatChannelRenderer extends HtmlChannelRenderer {
	readonly id = 'wechat';
	readonly label = '公众号';
	protected readonly style = WECHAT_STYLE;
}
