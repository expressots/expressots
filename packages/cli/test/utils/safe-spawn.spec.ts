/**
 * Tests for the `safe-spawn` helper.
 *
 * The point of this helper is two-fold:
 *   1. Forward to `cross-spawn` so Windows `.cmd` shims (npm, npx, tsx,
 *      tsc, ...) can run reliably under modern Node.js versions which
 *      refuse `spawn(*.cmd, [...], { shell: false })` (CVE-2024-27980).
 *   2. Apply sane defaults (`windowsHide: true`) and pass the caller
 *      options through verbatim.
 *
 * We mock `cross-spawn` so the tests don't actually launch processes.
 */

const spawnFn = jest.fn();
const syncFn = jest.fn();

jest.mock("cross-spawn", () => {
	const mock = ((...args: unknown[]) => spawnFn(...args)) as ((
		...args: unknown[]
	) => unknown) & { sync: (...args: unknown[]) => unknown };
	mock.sync = (...args: unknown[]) => syncFn(...args);
	return mock;
});

import { safeSpawn, safeSpawnSync } from "../../src/utils/safe-spawn";

beforeEach(() => {
	spawnFn.mockReset();
	syncFn.mockReset();
});

describe("safeSpawn", () => {
	it("forwards command and args verbatim to cross-spawn", () => {
		spawnFn.mockReturnValue({} as never);

		safeSpawn("npm", ["install", "axios"]);

		expect(spawnFn).toHaveBeenCalledTimes(1);
		const [cmd, args] = spawnFn.mock.calls[0] as [string, string[]];
		expect(cmd).toBe("npm");
		expect(args).toEqual(["install", "axios"]);
	});

	it("does NOT append .cmd on any platform (cross-spawn handles that)", () => {
		spawnFn.mockReturnValue({} as never);

		safeSpawn("npm", ["--version"]);

		const [cmd] = spawnFn.mock.calls[0] as [string, string[]];
		expect(cmd).toBe("npm");
		expect(cmd.endsWith(".cmd")).toBe(false);
	});

	it("defaults windowsHide to true to suppress the Windows console flash", () => {
		spawnFn.mockReturnValue({} as never);

		safeSpawn("npm", ["--version"]);

		const [, , options] = spawnFn.mock.calls[0] as [
			string,
			string[],
			{ windowsHide?: boolean },
		];
		expect(options.windowsHide).toBe(true);
	});

	it("forwards caller options (cwd, stdio, ...) through to cross-spawn", () => {
		spawnFn.mockReturnValue({} as never);

		safeSpawn("npm", ["install"], {
			cwd: "/tmp/proj",
			stdio: "inherit",
			timeout: 1234,
		});

		const [, , options] = spawnFn.mock.calls[0] as [
			string,
			string[],
			Record<string, unknown>,
		];
		expect(options.cwd).toBe("/tmp/proj");
		expect(options.stdio).toBe("inherit");
		expect(options.timeout).toBe(1234);
	});

	it("lets the caller override the windowsHide default", () => {
		spawnFn.mockReturnValue({} as never);

		safeSpawn("npm", ["--version"], { windowsHide: false });

		const [, , options] = spawnFn.mock.calls[0] as [
			string,
			string[],
			{ windowsHide: boolean },
		];
		expect(options.windowsHide).toBe(false);
	});

	it("defaults args to an empty array when none are supplied", () => {
		spawnFn.mockReturnValue({} as never);

		safeSpawn("docker");

		const [, args] = spawnFn.mock.calls[0] as [string, string[]];
		expect(args).toEqual([]);
	});
});

describe("safeSpawnSync", () => {
	it("forwards command and args verbatim to cross-spawn.sync", () => {
		syncFn.mockReturnValue({ status: 0 } as never);

		safeSpawnSync("npm", ["--version"], { stdio: "ignore" });

		expect(syncFn).toHaveBeenCalledTimes(1);
		const [cmd, args, options] = syncFn.mock.calls[0] as [
			string,
			string[],
			{ stdio: string; windowsHide: boolean },
		];
		expect(cmd).toBe("npm");
		expect(args).toEqual(["--version"]);
		expect(options.stdio).toBe("ignore");
		expect(options.windowsHide).toBe(true);
	});

	it("returns the cross-spawn.sync result unchanged", () => {
		const fakeResult = { status: 42, stdout: "", stderr: "", pid: 1 };
		syncFn.mockReturnValue(fakeResult as never);

		const result = safeSpawnSync("npm", ["--version"]);

		expect(result).toBe(fakeResult);
	});
});
