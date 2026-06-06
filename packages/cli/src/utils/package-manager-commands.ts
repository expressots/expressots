/**
 * Shared package-manager command helpers for code generators
 * (Dockerfiles, CI/CD pipelines). These centralize the mapping
 * between an analyzer-detected package manager and the literal
 * shell strings emitted into generated files.
 *
 * Two flavors exist:
 *   - `RUN`/`CMD`-style strings used INSIDE Dockerfiles.
 *   - Plain shell invocations used in CI scripts and informational
 *     comments (no `RUN ` prefix).
 */

import fs from "fs";
import path from "path";

export type SupportedPackageManager = "npm" | "yarn" | "pnpm" | "bun";

/**
 * Lockfile signatures for each package manager, in detection priority
 * order. Bun is matched by either the text `bun.lock` (default since
 * Bun v1.2) or the legacy binary `bun.lockb`. This mirrors the order
 * used by the containerize project analyzer so every command resolves
 * the same package manager for a given project.
 */
const LOCKFILE_SIGNATURES: ReadonlyArray<
	readonly [SupportedPackageManager, readonly string[]]
> = [
	["pnpm", ["pnpm-lock.yaml"]],
	["yarn", ["yarn.lock"]],
	["bun", ["bun.lock", "bun.lockb"]],
	["npm", ["package-lock.json"]],
];

/**
 * Detect the project's package manager from its lockfile. Returns
 * `null` when no recognized lockfile is present so callers can decide
 * whether to error or fall back to a default.
 */
export function detectPackageManager(
	cwd: string = process.cwd(),
): SupportedPackageManager | null {
	for (const [pm, files] of LOCKFILE_SIGNATURES) {
		if (files.some((file) => fs.existsSync(path.join(cwd, file)))) {
			return pm;
		}
	}
	return null;
}

/**
 * Like {@link detectPackageManager} but falls back to npm when no
 * lockfile is found, for callers that always need a usable manager.
 */
export function detectPackageManagerOrDefault(
	cwd: string = process.cwd(),
): SupportedPackageManager {
	return detectPackageManager(cwd) ?? "npm";
}

/**
 * Returns the argv (excluding the package manager binary itself) to add
 * a dependency, e.g. `["add", "--dev"]` for `pnpm add --dev <pkg>`.
 */
export function getAddPackageArgs(
	packageManager: string,
	options: { dev?: boolean } = {},
): string[] {
	const dev = options.dev ?? false;
	switch (packageManager) {
		case "pnpm":
			return dev ? ["add", "--save-dev"] : ["add"];
		case "yarn":
			return dev ? ["add", "--dev"] : ["add"];
		case "bun":
			return dev ? ["add", "--dev"] : ["add"];
		default:
			return dev ? ["install", "--save-dev"] : ["install"];
	}
}

/**
 * Returns the argv (excluding the package manager binary itself) to
 * remove a dependency, e.g. `["remove"]` for `yarn remove <pkg>`.
 */
export function getRemovePackageArgs(packageManager: string): string[] {
	switch (packageManager) {
		case "pnpm":
		case "yarn":
		case "bun":
			return ["remove"];
		default:
			return ["uninstall"];
	}
}

/**
 * Shell invocation that installs project dependencies, suitable for
 * a CI step (no `RUN ` prefix). Uses the strict, lockfile-respecting
 * variant for each package manager because CI runs should be
 * reproducible.
 *
 * When `bootstrapBun` is set and the project uses Bun, the returned
 * command first installs the Bun runtime globally via npm. This is
 * needed on CI platforms whose runner image ships Node/npm but not
 * Bun (GitLab, CircleCI, Bitbucket, Jenkins, Azure). GitHub Actions
 * provisions Bun with `oven-sh/setup-bun` instead, so it omits this.
 */
export function getCiInstallCommand(
	packageManager: string,
	options: { bootstrapBun?: boolean } = {},
): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm install --frozen-lockfile";
		case "yarn":
			return "yarn install --frozen-lockfile";
		case "bun":
			return options.bootstrapBun
				? "npm install -g bun && bun install --frozen-lockfile"
				: "bun install --frozen-lockfile";
		default:
			return "npm ci";
	}
}

/**
 * Shell invocation that runs a dependency vulnerability audit, gated
 * to high-severity findings. Used in CI security stages.
 */
export function getAuditCommand(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm audit --audit-level high";
		case "yarn":
			return "yarn npm audit --severity high";
		case "bun":
			return "bun audit";
		default:
			return "npm audit --audit-level=high";
	}
}

/**
 * The lockfile name a given package manager produces. Used for CI
 * cache keys that hash the lockfile (CircleCI, Azure Pipelines).
 * Bun resolves to the text lockfile `bun.lock` (default since v1.2).
 */
export function getLockfileName(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm-lock.yaml";
		case "yarn":
			return "yarn.lock";
		case "bun":
			return "bun.lock";
		default:
			return "package-lock.json";
	}
}

/**
 * Shell invocation that runs an npm-style script (e.g. `lint`,
 * `test`, `build`). Used in CI scripts and informational comments.
 */
export function getRunScriptCommand(
	packageManager: string,
	scriptName: string,
): string {
	switch (packageManager) {
		case "pnpm":
			return `pnpm run ${scriptName}`;
		case "yarn":
			return `yarn ${scriptName}`;
		case "bun":
			return `bun run ${scriptName}`;
		default:
			return `npm run ${scriptName}`;
	}
}

/**
 * Resolve the command + argv needed to execute a locally-installed
 * binary (e.g. a `node_modules/.bin` tool like `tsc`) through the
 * project's package manager.
 *
 * Each package manager exposes a different runner:
 *   - npm  -> `npx <bin>`
 *   - pnpm -> `pnpm exec <bin>`
 *   - yarn -> `yarn <bin>`        (Classic and Berry both resolve
 *                                   `node_modules/.bin` binaries this way)
 *   - bun  -> `bunx <bin>`
 *
 * Returning the binary + args as a single argv array lets callers pass
 * it straight to a spawn helper without shell parsing. The crucial
 * difference for Docker is that Bun images (`oven/bun`) ship `bunx` but
 * not `npx`, so a hardcoded `npx` breaks Bun builds.
 */
export function getExecCommand(
	packageManager: string,
	binary: string,
	args: string[] = [],
): { command: string; args: string[] } {
	switch (packageManager) {
		case "pnpm":
			return { command: "pnpm", args: ["exec", binary, ...args] };
		case "yarn":
			return { command: "yarn", args: [binary, ...args] };
		case "bun":
			return { command: "bunx", args: [binary, ...args] };
		default:
			return { command: "npx", args: [binary, ...args] };
	}
}
