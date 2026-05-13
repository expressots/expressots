/**
 * Cross-platform wrappers around `child_process.spawn` / `spawnSync` for
 * launching package-manager binaries (npm, yarn, pnpm, npx, tsx, tsc,
 * docker, etc.) reliably on every supported platform.
 *
 * Why this exists
 * ---------------
 * Starting with Node.js 18.20.2 / 20.12.2 / 21.7.3 (and every v22+), the
 * runtime refuses to spawn `.bat` / `.cmd` files unless `shell: true` is
 * passed (see CVE-2024-27980). On Windows, `npm`, `yarn`, `pnpm`, `npx`,
 * `tsx`, `tsc`, and the `node_modules/.bin/*` shims are all `.cmd` files,
 * so a direct `spawn("npm", [...], { shell: false })` call now fails with
 * `EINVAL` ("Package manager not found"). At the same time, just flipping
 * `shell: true` reintroduces the original CVE: arguments containing shell
 * metacharacters (`|`, `>`, `<`, `^`, `&`, `(`, `)`, ...) get interpreted
 * by `cmd.exe` instead of being passed verbatim, which is a real concern
 * for inputs like a semver range (`>=1.0.0 <2.0.0`) or a user-supplied
 * `--src` flag.
 *
 * `cross-spawn` solves both problems:
 *   - On Windows it parses the command, resolves `.cmd` shims via PATHEXT,
 *     and invokes `cmd.exe /d /s /c "command args"` with `shell: false` and
 *     `windowsVerbatimArguments: true`. Each argv entry is passed through a
 *     cmd.exe-aware escaper, so metacharacters stay literal.
 *   - On Unix it falls through to plain `spawn` with `shell: false`.
 *
 * The helpers here are thin wrappers that default `windowsHide: true` so
 * the Windows console doesn't flash, and re-export the same options shape
 * as `child_process` for drop-in usage.
 */

import type {
	ChildProcess,
	SpawnOptions,
	SpawnSyncOptions,
	SpawnSyncReturns,
} from "node:child_process";
import spawn from "cross-spawn";

export function safeSpawn(
	command: string,
	args: ReadonlyArray<string> = [],
	options: SpawnOptions = {},
): ChildProcess {
	return spawn(command, args, {
		windowsHide: true,
		...options,
	});
}

export function safeSpawnSync(
	command: string,
	args: ReadonlyArray<string> = [],
	options: SpawnSyncOptions = {},
): SpawnSyncReturns<Buffer> {
	return spawn.sync(command, args, {
		windowsHide: true,
		...options,
	}) as SpawnSyncReturns<Buffer>;
}
