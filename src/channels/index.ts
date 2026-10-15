import type { ChannelRenderer } from './types';
import { BlogChannelRenderer } from './blog-channel';
import { WechatChannelRenderer } from './wechat-channel';
import { ToutiaoChannelRenderer } from './toutiao-channel';

/** A channel as shown in the dropdown, without instantiating a renderer. */
export interface ChannelInfo {
	id: string;
	label: string;
}

/** Channels available for preview, in display order. */
export function listChannels(): ChannelInfo[] {
	return [
		{ id: 'wechat', label: '公众号' },
		{ id: 'toutiao', label: '头条' },
		{ id: 'blog', label: '博客' },
	];
}

/** Instantiate the renderer for a channel id. */
export function createRenderer(id: string): ChannelRenderer | undefined {
	switch (id) {
		case 'blog':
			return new BlogChannelRenderer();
		case 'wechat':
			return new WechatChannelRenderer();
		case 'toutiao':
			return new ToutiaoChannelRenderer();
		default:
			return undefined;
	}
}
