import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';

/** Result of a finished child process. */
export interface CommandResult {
	/** Exit code, or `null` when the process was killed by a signal. */
	code: number | null;
	/** Captured standard output. */
	stdout: string;
	/** Captured standard error. */
	stderr: string;
}

/** Extra directories that Obsidian cannot see without help. */
const PATH_SEPARATOR = ':';

/**
 * Copy `process.env` and prepend additional `PATH` entries.
 *
 * Obsidian is started by the macOS window server, so it does not inherit the
 * PATH of a login shell. Homebrew binaries such as `hugo` and `git` live in
 * `/opt/homebrew/bin`, which means a bare `spawn('hugo')` fails unless the
 * directory is added explicitly.
 *
 * @param extraPath - Colon-separated directories to prepend, highest first.
 */
export function buildProcessEnv(extraPath: string): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env };
	const entries = extraPath
		.split(PATH_SEPARATOR)
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
	const existing = (env.PATH ?? '')
		.split(PATH_SEPARATOR)
		.filter((entry) => entry !== '');

	env.PATH = [...new Set([...entries, ...existing])].join(PATH_SEPARATOR);
	return env;
}

/** Start a child process without waiting for it to finish. */
export function startProcess(
	command: string,
	args: string[],
	options: SpawnOptions,
): ChildProcess {
	return spawn(command, args, options);
}

/**
 * Run a command to completion and capture its output.
 *
 * Resolves on `close` rather than `exit` so the stdout and stderr streams are
 * guaranteed to have been flushed before the caller reads them.
 *
 * @param timeoutMs - Kill the process after this many milliseconds.
 */
export function runCommand(
	command: string,
	args: string[],
	options: SpawnOptions & { timeoutMs?: number },
): Promise<CommandResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, options);
		let stdout = '';
		let stderr = '';
		let settled = false;

		const timer =
			options.timeoutMs === undefined
				? null
				: window.setTimeout(() => {
						child.kill('SIGTERM');
					}, options.timeoutMs);

		child.stdout?.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr?.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		child.on('error', (error) => {
			if (settled) return;
			settled = true;
			if (timer) window.clearTimeout(timer);
			reject(error);
		});

		child.on('close', (code) => {
			if (settled) return;
			settled = true;
			if (timer) window.clearTimeout(timer);
			resolve({ code, stdout, stderr });
		});
	});
}

/** Last non-empty lines of a command's output, useful for error notices. */
export function tail(text: string, lines = 6): string {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '')
		.slice(-lines)
		.join('\n');
}
