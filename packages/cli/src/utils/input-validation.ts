/**
 * Input validation utilities used across the CLI to defend against
 * command injection and path traversal when user-supplied values flow
 * into child_process spawn/exec calls or filesystem writes.
 */

import path from "node:path";

/**
 * Characters that have shell-special meaning across POSIX shells and
 * Windows cmd. If any appear in a value that will be interpolated into
 * a shell-evaluated command (`shell: true` or `execSync(string)`), the
 * value must be rejected.
 */
const SHELL_METACHARACTERS = /[;&|`$()<>\n\r\\"'*?{}[\]!#~]/;

/**
 * Conservative regex for npm package names. Allows scoped packages,
 * dotted segments and dashes, mirroring https://docs.npmjs.com/cli/v10/configuring-npm/package-json#name
 * but stricter than npm itself to remove ambiguity (no leading dots,
 * no uppercase to keep it portable across registries).
 */
const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

/**
 * Semver-ish range validator. Accepts the common syntactic shapes
 * (e.g. 1.2.3, ^1.2, ~1, 1.x, latest, next, >=1.2.3 <2.0.0) without
 * pulling in the full semver parser for this guard.
 */
const VERSION_RE = /^[A-Za-z0-9.\-+~^>=<* |]+$/;

/**
 * Script name validator for npm/yarn/pnpm `run` targets. Matches what
 * those package managers actually accept (alphanumerics plus
 * `:_-./`), explicitly rejecting whitespace and shell metacharacters.
 */
const SCRIPT_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9:_./-]*$/;

/**
 * Guard against shell metacharacters in any value that will be
 * interpolated into a shell-evaluated command line.
 */
export function containsShellMetachars(value: string): boolean {
	return SHELL_METACHARACTERS.test(value);
}

/**
 * Validate an npm package name (with optional scope).
 */
export function isValidPackageName(name: unknown): name is string {
	if (typeof name !== "string" || name.length === 0 || name.length > 214) {
		return false;
	}
	if (containsShellMetachars(name)) return false;
	return PACKAGE_NAME_RE.test(name);
}

/**
 * Validate a version specifier passed to a package manager. Accepts
 * `latest`, `next`, exact versions and common range syntaxes
 * (`>=1.2.3 <2.0.0`, `*`, `1.x`). Returns false for the boolean
 * fallback yargs sometimes assigns when the flag is absent.
 *
 * Versions are forwarded via argv (`shell: false`), so we whitelist
 * the characters npm itself accepts in semver ranges and reject the
 * rest. We do NOT layer the broader `containsShellMetachars` check
 * here because legitimate ranges include `<`, `>`, `|`, and `*`.
 */
export function isValidVersion(version: unknown): version is string {
	if (typeof version !== "string" || version.length === 0) return false;
	if (version.length > 64) return false;
	return VERSION_RE.test(version);
}

/**
 * Validate an npm/yarn/pnpm script name.
 */
export function isValidScriptName(name: unknown): name is string {
	if (typeof name !== "string" || name.length === 0 || name.length > 214) {
		return false;
	}
	if (containsShellMetachars(name)) return false;
	return SCRIPT_NAME_RE.test(name);
}

/**
 * Validate a package manager identifier.
 */
const ALLOWED_PACKAGE_MANAGERS = new Set(["npm", "yarn", "pnpm", "bun"]);

export function isValidPackageManager(
	pm: unknown,
): pm is "npm" | "yarn" | "pnpm" | "bun" {
	return typeof pm === "string" && ALLOWED_PACKAGE_MANAGERS.has(pm);
}

/**
 * Resolve `target` against `base` and verify the result is contained
 * within `base`. Returns the resolved absolute path on success, or
 * `null` when the resolved path escapes the base directory (path
 * traversal attempt).
 */
export function safeResolveWithin(base: string, target: string): string | null {
	const absoluteBase = path.resolve(base);
	const absoluteTarget = path.resolve(absoluteBase, target);

	const baseWithSep = absoluteBase.endsWith(path.sep)
		? absoluteBase
		: absoluteBase + path.sep;

	if (
		absoluteTarget !== absoluteBase &&
		!absoluteTarget.startsWith(baseWithSep)
	) {
		return null;
	}

	return absoluteTarget;
}

/**
 * Throws a generic `Error` if the value is not a safe package name.
 */
export function assertValidPackageName(name: unknown): asserts name is string {
	if (!isValidPackageName(name)) {
		throw new Error(
			`Invalid package name: ${JSON.stringify(name)}. Names must match npm package name rules and contain no shell metacharacters.`,
		);
	}
}

/**
 * Throws a generic `Error` if the value is not a safe version range.
 */
export function assertValidVersion(
	version: unknown,
): asserts version is string {
	if (!isValidVersion(version)) {
		throw new Error(
			`Invalid version specifier: ${JSON.stringify(version)}.`,
		);
	}
}

/**
 * Throws a generic `Error` if the value is not a safe script name.
 */
export function assertValidScriptName(name: unknown): asserts name is string {
	if (!isValidScriptName(name)) {
		throw new Error(
			`Invalid script name: ${JSON.stringify(name)}. Script names must match ^[a-zA-Z0-9][a-zA-Z0-9:_./-]*$.`,
		);
	}
}
