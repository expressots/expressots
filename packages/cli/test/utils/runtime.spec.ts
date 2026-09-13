import fs from "fs";
import os from "os";
import path from "path";

const spawnSyncMock = jest.fn();
jest.mock("../../src/utils/safe-spawn", () => ({
	safeSpawn: jest.fn(),
	safeSpawnSync: (...args: unknown[]) => spawnSyncMock(...args),
}));

import {
	isBunAvailable,
	resolveRuntime,
	RUNTIME_ENV,
} from "../../src/utils/runtime";

describe("utils/runtime", () => {
	let dir: string;
	const envBefore = process.env[RUNTIME_ENV];

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-runtime-"));
		spawnSyncMock.mockReset();
		delete process.env[RUNTIME_ENV];
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
		if (envBefore === undefined) delete process.env[RUNTIME_ENV];
		else process.env[RUNTIME_ENV] = envBefore;
	});

	it("defaults to node when the project does not use Bun", () => {
		fs.writeFileSync(path.join(dir, "pnpm-lock.yaml"), "");
		spawnSyncMock.mockReturnValue({ status: 0 });

		expect(resolveRuntime(undefined, dir)).toBe("node");
		expect(spawnSyncMock).not.toHaveBeenCalled();
	});

	it("picks bun when the lockfile is Bun's and the binary answers", () => {
		fs.writeFileSync(path.join(dir, "bun.lock"), "{}");
		spawnSyncMock.mockReturnValue({ status: 0 });

		expect(resolveRuntime(undefined, dir)).toBe("bun");
		expect(spawnSyncMock).toHaveBeenCalledWith(
			"bun",
			["--version"],
			expect.objectContaining({ stdio: "ignore" }),
		);
	});

	it("falls back to node when the project uses Bun but the binary is missing", () => {
		fs.writeFileSync(path.join(dir, "bun.lockb"), "");
		spawnSyncMock.mockReturnValue({ status: 1 });
		expect(resolveRuntime(undefined, dir)).toBe("node");

		spawnSyncMock.mockImplementation(() => {
			throw new Error("ENOENT");
		});
		expect(resolveRuntime(undefined, dir)).toBe("node");
		expect(isBunAvailable()).toBe(false);
	});

	it("honours an explicit flag over detection", () => {
		fs.writeFileSync(path.join(dir, "bun.lock"), "{}");
		spawnSyncMock.mockReturnValue({ status: 0 });
		expect(resolveRuntime("node", dir)).toBe("node");

		fs.unlinkSync(path.join(dir, "bun.lock"));
		expect(resolveRuntime("bun", dir)).toBe("bun");
		// No probe when the choice is explicit.
		expect(spawnSyncMock).not.toHaveBeenCalled();
	});

	it("honours the environment variable below the flag", () => {
		process.env[RUNTIME_ENV] = "bun";
		expect(resolveRuntime(undefined, dir)).toBe("bun");
		expect(resolveRuntime("node", dir)).toBe("node");
	});

	it("rejects unknown runtimes by name", () => {
		process.env[RUNTIME_ENV] = "deno";
		expect(() => resolveRuntime(undefined, dir)).toThrow(
			/Unknown runtime "deno"/,
		);
		expect(() => resolveRuntime("quickjs", dir)).toThrow(/node, bun/);
	});
});
