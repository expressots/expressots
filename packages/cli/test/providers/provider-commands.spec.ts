/**
 * Tests for `addProvider` and `removeProvider`.
 *
 * The functions shell out to npm/yarn/pnpm via `safeSpawn` (which uses
 * `cross-spawn` under the hood for Windows `.cmd` shim handling). We
 * mock `cross-spawn` so no real install runs, and we run inside a
 * temp dir so the lock-file detection picks the manager we want.
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const spawnMock = jest.fn();

jest.mock("cross-spawn", () => {
	const fn = (...args: unknown[]) => spawnMock(...args);
	(fn as unknown as { sync: jest.Mock }).sync = jest.fn();
	return fn;
});

import { addProvider, removeProvider } from "../../src/providers/add/form";
import { printError } from "../../src/utils/cli-ui";

jest.mock("../../src/utils/cli-ui", () => ({
	printError: jest.fn(),
	printSuccess: jest.fn(),
	printWarning: jest.fn(),
	printInfo: jest.fn(),
	printDebug: jest.fn(),
	printHeader: jest.fn(),
	printGenerateError: jest.fn(),
	printGenerateSuccess: jest.fn(),
}));

const printErrorMock = printError as jest.Mock;

let originalCwd: string;
let tmpDir: string;

function makeFakeChildProcess(exitCode: number = 0) {
	const child = new EventEmitter() as EventEmitter & {
		stdout: EventEmitter;
		stderr: EventEmitter;
	};
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	setImmediate(() => child.emit("close", exitCode));
	return child;
}

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-prov-"));
	process.chdir(tmpDir);
	spawnMock.mockReset();
	printErrorMock.mockClear();
});

afterEach(() => {
	process.chdir(originalCwd);
	try {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	} catch {
		// best-effort
	}
});

describe("addProvider", () => {
	it("uses npm when package-lock.json is present", async () => {
		fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await addProvider("@expressots/cache");

		expect(spawnMock).toHaveBeenCalledTimes(1);
		const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
		// cross-spawn handles the Windows `.cmd` shim resolution
		// internally, so the command we forward is always the bare name.
		expect(cmd).toBe("npm");
		expect(args).toEqual(["install", "@expressots/cache"]);
	});

	it("uses yarn when yarn.lock is present", async () => {
		fs.writeFileSync(path.join(tmpDir, "yarn.lock"), "");
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await addProvider("axios");

		expect(spawnMock).toHaveBeenCalledTimes(1);
		const [, args] = spawnMock.mock.calls[0] as [string, string[]];
		expect(args).toEqual(["add", "axios"]);
	});

	it("uses pnpm when pnpm-lock.yaml is present", async () => {
		fs.writeFileSync(path.join(tmpDir, "pnpm-lock.yaml"), "");
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await addProvider("axios");

		const [, args] = spawnMock.mock.calls[0] as [string, string[]];
		expect(args).toEqual(["add", "axios"]);
	});

	it("appends @version when version is supplied", async () => {
		fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await addProvider("axios", "1.7.2");

		const [, args] = spawnMock.mock.calls[0] as [string, string[]];
		expect(args).toEqual(["install", "axios@1.7.2"]);
	});

	it("treats 'latest' as no suffix", async () => {
		fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await addProvider("axios", "latest");

		const [, args] = spawnMock.mock.calls[0] as [string, string[]];
		expect(args).toEqual(["install", "axios"]);
	});

	it("uses --save-dev for dev dependencies (npm)", async () => {
		fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await addProvider("axios", undefined, true);

		const [, args] = spawnMock.mock.calls[0] as [string, string[]];
		expect(args).toEqual(["install", "--save-dev", "axios"]);
	});

	it("rejects invalid package names without spawning", async () => {
		fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");

		await addProvider("axios; rm -rf /");

		expect(spawnMock).not.toHaveBeenCalled();
		expect(printErrorMock).toHaveBeenCalled();
	});

	it("rejects shell-metachar-laden package names", async () => {
		fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");

		await addProvider("axios && curl evil.com");

		expect(spawnMock).not.toHaveBeenCalled();
	});

	it("rejects invalid version strings", async () => {
		fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");

		await addProvider("axios", "1.0.0; ls");

		expect(spawnMock).not.toHaveBeenCalled();
		expect(printErrorMock).toHaveBeenCalled();
	});

	it("warns and exits when no package manager is detected", async () => {
		// no lock files in tmpDir
		await addProvider("axios");

		expect(spawnMock).not.toHaveBeenCalled();
		expect(printErrorMock).toHaveBeenCalled();
	});
});

describe("removeProvider", () => {
	it("uses npm uninstall when package-lock.json is present", async () => {
		fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await removeProvider("axios");

		const [, args] = spawnMock.mock.calls[0] as [string, string[]];
		expect(args).toEqual(["uninstall", "axios"]);
	});

	it("uses yarn remove when yarn.lock is present", async () => {
		fs.writeFileSync(path.join(tmpDir, "yarn.lock"), "");
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await removeProvider("axios");

		const [, args] = spawnMock.mock.calls[0] as [string, string[]];
		expect(args).toEqual(["remove", "axios"]);
	});

	it("rejects invalid package names without spawning", async () => {
		fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");

		await removeProvider("$(rm -rf ~)");

		expect(spawnMock).not.toHaveBeenCalled();
		expect(printErrorMock).toHaveBeenCalled();
	});
});
