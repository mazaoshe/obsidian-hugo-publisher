import { runCommand, tail, type CommandResult } from '../utils/process';

/** Options shared by every Git invocation. */
export interface GitOptions {
	/** Absolute path to the git binary. */
	gitPath: string;
	/** Absolute path to the repository working tree. */
	projectRoot: string;
	/** Environment for the child process, proxy variables included. */
	env: NodeJS.ProcessEnv;
}

/** Raised when Git fails in a way the user has to resolve. */
export class GitError extends Error {}

/** Turn a failed command result into a readable error. */
function toError(action: string, result: CommandResult): GitError {
	const detail = tail([result.stderr, result.stdout].filter(Boolean).join('\n')) ;
	return new GitError(
		detail === ''
			? `${action} 失败（退出码 ${result.code}）。`
			: `${action} 失败：\n${detail}`,
	);
}

/**
 * Run a Git command inside the Hugo project.
 *
 * @param timeoutMs - Kill the command after this many milliseconds. Pushes can
 *   block on credential prompts, so they always pass a timeout.
 */
async function git(
	options: GitOptions,
	args: string[],
	timeoutMs: number,
): Promise<CommandResult> {
	return runCommand(options.gitPath, args, {
		cwd: options.projectRoot,
		env: options.env,
		timeoutMs,
	});
}

/** Stage only the given project-relative paths. */
export async function stagePaths(options: GitOptions, paths: string[]): Promise<void> {
	if (paths.length === 0) return;
	const result = await git(options, ['add', '--', ...paths], 30_000);
	if (result.code !== 0) throw toError('git add', result);
}

/**
 * Report whether the index has anything staged.
 *
 * `git diff --cached --quiet` exits with 1 when there is a difference and 0 when
 * there is not; larger codes are real errors.
 */
export async function hasStagedChanges(options: GitOptions): Promise<boolean> {
	const result = await git(options, ['diff', '--cached', '--quiet'], 30_000);
	if (result.code === 0) return false;
	if (result.code === 1) return true;
	throw toError('git diff --cached', result);
}

/** Commit the staged changes. */
export async function commit(options: GitOptions, message: string): Promise<void> {
	const result = await git(options, ['commit', '-m', message], 60_000);
	if (result.code !== 0) throw toError('git commit', result);
}

/** Push the current branch to its remote. */
export async function push(
	options: GitOptions,
	remote: string,
	branch: string,
): Promise<void> {
	const result = await git(options, ['push', remote, branch], 180_000);
	if (result.code !== 0) throw toError('git push', result);
}
