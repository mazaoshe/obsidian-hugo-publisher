import type HugoPublisherPlugin from '../main';
import { buildProcessEnv } from '../utils/process';
import type { HugoOptions } from './hugo';
import type { GitOptions } from './git';

/** Hugo invocation options built from the current settings. */
export function hugoOptions(plugin: HugoPublisherPlugin): HugoOptions {
	return {
		hugoPath: plugin.settings.hugoPath,
		projectRoot: plugin.settings.hugoProjectRoot,
		env: buildProcessEnv(plugin.settings.extraPath),
	};
}

/** Git options built from the current settings, proxy variables included. */
export function gitOptions(plugin: HugoPublisherPlugin): GitOptions {
	const env = buildProcessEnv(plugin.settings.extraPath);
	const { useProxy, proxyUrl } = plugin.settings;

	if (useProxy && proxyUrl !== '') {
		env.HTTPS_PROXY = proxyUrl;
		env.HTTP_PROXY = proxyUrl;
		env.https_proxy = proxyUrl;
		env.http_proxy = proxyUrl;
	}

	return {
		gitPath: plugin.settings.gitPath,
		projectRoot: plugin.settings.hugoProjectRoot,
		env,
	};
}
