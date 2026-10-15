import type { ChildProcess } from 'node:child_process';
import net from 'node:net';
import { runCommand, startProcess, tail, type CommandResult } from '../utils/process';

/** How long to wait for Hugo to report that the preview server is listening. */
const PREVIEW_READY_TIMEOUT_MS = 60_000;

/** Hugo prints this once the server is accepting connections. */
const PREVIEW_READY_PATTERN = /Web Server is available at (https?:\/\/\S+)/;

/** Options shared by every Hugo invocation. */
export interface HugoOptions {
	/** Absolute path to the Hugo binary. */
	hugoPath: string;
	/** Absolute path to the Hugo project root. */
	projectRoot: string;
	/** Environment for the child process, with a usable `PATH`. */
	env: NodeJS.ProcessEnv;
}

/** Reason a preview could not be started. */
export class PreviewError extends Error {}

/**
 * Probe whether something is already listening on a local port.
 *
 * Used to reuse a `hugo server` that survived an unclean Obsidian quit instead
 * of spawning a second one that would fail with "address already in use".
 *
 * @param port - Port to probe.
 * @param host - Bind address, matching `hugo server --bind`.
 * @param timeoutMs - How long to wait for a connection.
 */
export function isPortOpen(port: number, host = '127.0.0.1', timeoutMs = 800): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = net.createConnection({ port, host });
		let settled = false;

		const done = (open: boolean) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve(open);
		};

		socket.setTimeout(timeoutMs);
		socket.once('connect', () => done(true));
		socket.once('timeout', () => done(false));
		socket.once('error', () => done(false));
	});
}

/**
 * Owns the lifecycle of a `hugo server` child process.
 *
 * One instance is stored on the plugin so a preview started by one command can
 * be stopped by another, and so it can be torn down when the plugin unloads.
 */
export class PreviewServer {
	private child: ChildProcess | null = null;

	/** Whether a preview process is currently running. */
	isRunning(): boolean {
		return this.child !== null;
	}

	/**
	 * Start `hugo server` and resolve once it is reachable.
	 *
	 * @param options - Paths and environment for the Hugo invocation.
	 * @param port - Local port to bind.
	 * @returns The URL the preview is served from.
	 * @throws {PreviewError} When Hugo exits or never reports readiness.
	 */
	async start(options: HugoOptions, port: number): Promise<string> {
		if (this.child) {
			throw new PreviewError('预览服务已在运行。');
		}

		const child = startProcess(
			options.hugoPath,
			[
				'server',
				'--port',
				String(port),
				'--bind',
				'127.0.0.1',
				'--buildDrafts',
				'--cleanDestinationDir',
			],
			{ cwd: options.projectRoot, env: options.env },
		);
		this.child = child;

		try {
			return await waitForReady(child);
		} catch (error) {
			this.stop();
			throw error;
		}
	}

	/** Stop the preview process, if one is running. */
	stop(): void {
		const child = this.child;
		this.child = null;
		if (!child || child.exitCode !== null) return;
		child.kill('SIGTERM');

		// Fallback: force-kill if the process does not exit promptly. `hugo server`
		// serves from memory, so a hard kill is safe and prevents orphaned
		// processes that would otherwise keep the preview port occupied.
		window.setTimeout(() => {
			if (child.exitCode === null && child.signalCode === null) {
				child.kill('SIGKILL');
			}
		}, 1500);
	}
}

/**
 * Wait until Hugo prints its "Web Server is available" banner.
 *
 * Rejects early when the process exits, so a configuration mistake surfaces as
 * a useful message instead of a minute-long hang.
 */
function waitForReady(child: ChildProcess): Promise<string> {
	return new Promise((resolve, reject) => {
		let output = '';
		let settled = false;

		const finish = (action: () => void) => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timer);
			action();
		};

		const timer = window.setTimeout(() => {
			finish(() => {
				reject(
					new PreviewError(
						`Hugo 在 ${PREVIEW_READY_TIMEOUT_MS / 1000} 秒内未启动。\n${tail(output)}`,
					),
				);
			});
		}, PREVIEW_READY_TIMEOUT_MS);

		const scan = (chunk: string) => {
			output += chunk;
			const match = PREVIEW_READY_PATTERN.exec(output);
			if (match?.[1]) {
				finish(() => resolve(match[1] as string));
			}
		};

		child.stdout?.on('data', (chunk: Buffer) => scan(chunk.toString()));
		child.stderr?.on('data', (chunk: Buffer) => scan(chunk.toString()));

		child.on('error', (error) => {
			finish(() =>
				reject(
					new PreviewError(
						`无法运行 Hugo（${error.message}）。请检查设置里的 Hugo 路径。`,
					),
				),
			);
		});

		child.on('exit', (code) => {
			finish(() =>
				reject(
					new PreviewError(`Hugo 已退出，退出码 ${code}。\n${tail(output)}`),
				),
			);
		});
	});
}

/**
 * Build the site once, without minification, as a pre-publish sanity check.
 *
 * @param options - Paths and environment for the Hugo invocation.
 */
export function buildSite(options: HugoOptions): Promise<CommandResult> {
	return runCommand(options.hugoPath, ['--gc', '--minify'], {
		cwd: options.projectRoot,
		env: options.env,
		timeoutMs: 180_000,
	});
}
