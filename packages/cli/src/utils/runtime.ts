import { detectPackageManager } from "./package-manager-commands";
import { safeSpawnSync } from "./safe-spawn";

/** JavaScript runtimes `expressots dev` / `expressots prod` can launch the app with. */
export type Runtime = "node" | "bun";

export const RUNTIMES: ReadonlyArray<Runtime> = ["node", "bun"];

/** Environment variable that selects the runtime when no `--runtime` flag is given. */
export const RUNTIME_ENV = "EXPRESSOTS_RUNTIME";

function isRuntime(value: string): value is Runtime {
	return (RUNTIMES as ReadonlyArray<string>).includes(value);
}

/**
 * Whether a `bun` binary is reachable on PATH.
 *
 * A Bun lockfile says the project installs with Bun, not that the machine
 * running `expressots dev` has it (a Node-only CI image, for instance), so
 * the runtime is only auto-selected when the binary answers.
 */
export function isBunAvailable(): boolean {
	try {
		const result = safeSpawnSync("bun", ["--version"], { stdio: "ignore" });
		return result?.status === 0;
	} catch {
		return false;
	}
}

/**
 * Decide which runtime launches the application.
 *
 * Precedence: the explicit `--runtime` flag, then `EXPRESSOTS_RUNTIME`,
 * then auto-detection: `bun` when the project's lockfile is Bun's and the
 * binary is available, otherwise `node` (via `tsx` in dev).
 */
export function resolveRuntime(
	explicit?: string,
	cwd: string = process.cwd(),
): Runtime {
	const requested = explicit ?? process.env[RUNTIME_ENV];
	if (requested !== undefined && requested !== "") {
		if (!isRuntime(requested)) {
			throw new Error(
				`Unknown runtime "${requested}". Use one of: ${RUNTIMES.join(", ")}`,
			);
		}
		return requested;
	}

	if (detectPackageManager(cwd) === "bun" && isBunAvailable()) {
		return "bun";
	}
	return "node";
}
