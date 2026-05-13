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

export type SupportedPackageManager = "npm" | "yarn" | "pnpm" | "bun";

/**
 * Shell invocation that installs project dependencies, suitable for
 * a CI step (no `RUN ` prefix). Uses the strict, lockfile-respecting
 * variant for each package manager because CI runs should be
 * reproducible.
 */
export function getCiInstallCommand(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm install --frozen-lockfile";
		case "yarn":
			return "yarn install --frozen-lockfile";
		case "bun":
			return "bun install --frozen-lockfile";
		default:
			return "npm ci";
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
