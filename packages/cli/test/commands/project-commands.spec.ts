/**
 * Tests for `dev`, `build`, `prod` (and the underlying `runCommand`).
 *
 * `runCommand` shells out to `tsx` / `npx tsc` / `node` via `safeSpawn`
 * (which is `cross-spawn`), and `clearScreen` shells out to
 * `cls` / `clear` via the raw `child_process.spawn`. We route both
 * through a single `spawnMock` so each test can assert on the full
 * spawn history. We also mock the `Compiler` singleton to return a
 * fixed `ExpressoConfig`. Each test runs in an isolated temp dir.
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

jest.mock("child_process", () => {
	const actual = jest.requireActual("child_process");
	return {
		...actual,
		spawn: (...args: unknown[]) => spawnMock(...args),
	};
});

const loadConfigMock = jest.fn();

jest.mock("../../src/utils/compiler", () => ({
	__esModule: true,
	default: {
		loadConfig: () => loadConfigMock(),
	},
}));

import {
	buildCommand,
	devCommand,
	prodCommand,
	runCommand,
} from "../../src/commands/project.commands";

let originalCwd: string;
let tmpDir: string;

function makeFakeChildProcess(exitCode: number = 0) {
	const child = new EventEmitter() as EventEmitter & {
		stdout?: EventEmitter;
		stderr?: EventEmitter;
	};
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	setImmediate(() => child.emit("close", exitCode));
	return child;
}

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-proj-"));
	process.chdir(tmpDir);
	spawnMock.mockReset();
	loadConfigMock.mockReset();
	loadConfigMock.mockResolvedValue({
		opinionated: true,
		entryPoint: "main",
		sourceRoot: "src",
		scaffoldPattern: "kebab-case",
	});
});

afterEach(() => {
	process.chdir(originalCwd);
	try {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	} catch {
		// best-effort
	}
});

describe("command module shape", () => {
	it("devCommand exposes name and builder options", () => {
		expect(devCommand.command).toBe("dev");
		expect(devCommand.describe).toMatch(/development/i);
		expect(devCommand.builder).toBeDefined();
	});

	it("buildCommand exposes name", () => {
		expect(buildCommand.command).toBe("build");
		expect(buildCommand.describe).toMatch(/build/i);
	});

	it("prodCommand exposes name", () => {
		expect(prodCommand.command).toBe("prod");
		expect(prodCommand.describe).toMatch(/production/i);
	});
});

describe("runCommand: dev", () => {
	beforeEach(() => {
		fs.writeFileSync(
			path.join(tmpDir, "tsconfig.build.json"),
			JSON.stringify({ compilerOptions: { outDir: "./dist" } }),
		);
	});

	it("invokes the tsx watch subcommand and the entrypoint", async () => {
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await runCommand({ command: "dev" });

		expect(spawnMock).toHaveBeenCalledTimes(1);
		const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
		// cross-spawn handles the Windows `.cmd` shim resolution
		// internally, so the command we forward is always the bare name.
		expect(cmd).toBe("tsx");
		// The `watch` subcommand (not the root `--watch` flag) must be the
		// first arg so the watch-specific flags below are recognised.
		expect(args[0]).toBe("watch");
		expect(args.some((a) => a.endsWith("./src/main.ts"))).toBe(true);
	});

	it("keeps logs across reloads and excludes generated/output files", async () => {
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await runCommand({ command: "dev" });

		const args = spawnMock.mock.calls[0][1] as string[];
		expect(args).toContain("--clear-screen=false");
		expect(args).toContain("--exclude");
		expect(args).toContain("**/*.generated.*");
		expect(args).toContain("**/dist/**");
	});

	it("does not force polling unless EXPRESSOTS_WATCH_POLL is set", async () => {
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await runCommand({ command: "dev" });

		const opts = spawnMock.mock.calls[0][2] as { env?: NodeJS.ProcessEnv };
		// No env override object is passed, so the child inherits the
		// parent environment untouched.
		expect(opts.env).toBeUndefined();
	});

	it("enables chokidar polling when EXPRESSOTS_WATCH_POLL is set", async () => {
		process.env.EXPRESSOTS_WATCH_POLL = "1";
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		try {
			await runCommand({ command: "dev" });
		} finally {
			delete process.env.EXPRESSOTS_WATCH_POLL;
		}

		const opts = spawnMock.mock.calls[0][2] as { env?: NodeJS.ProcessEnv };
		expect(opts.env?.CHOKIDAR_USEPOLLING).toBe("1");
		expect(opts.env?.CHOKIDAR_INTERVAL).toBe("300");
	});

	it("does not preload tsconfig-paths/register (tsx resolves paths natively)", async () => {
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await runCommand({ command: "dev" });

		const args = spawnMock.mock.calls[0][1] as string[];
		expect(args).not.toContain("-r");
		expect(args).not.toContain("tsconfig-paths/register");
	});
});

describe("runCommand: build", () => {
	beforeEach(() => {
		fs.writeFileSync(
			path.join(tmpDir, "tsconfig.build.json"),
			JSON.stringify({
				compilerOptions: {
					outDir: "./dist",
					baseUrl: "./src",
					paths: { "@util/*": ["util/*"] },
				},
			}),
		);
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({ name: "x" }),
		);

		// Stub spawn to simulate tsc actually creating the out dir on
		// success; otherwise the post-build path-alias walker explodes.
		spawnMock.mockImplementation(() => {
			fs.mkdirSync(path.join(tmpDir, "dist"), { recursive: true });
			return makeFakeChildProcess(0);
		});
	});

	it("calls npx tsc -p tsconfig.build.json", async () => {
		await runCommand({ command: "build" });

		expect(spawnMock).toHaveBeenCalledTimes(1);
		const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
		// cross-spawn handles the Windows `.cmd` shim resolution
		// internally, so the command we forward is always the bare name.
		expect(cmd).toBe("npx");
		expect(args).toEqual(["tsc", "-p", "tsconfig.build.json"]);
	});

	it("creates outDir if missing", async () => {
		await runCommand({ command: "build" });

		expect(fs.existsSync(path.join(tmpDir, "dist"))).toBe(true);
	});

	it("aborts build when tsconfig.build.json is missing", async () => {
		fs.unlinkSync(path.join(tmpDir, "tsconfig.build.json"));
		const exitSpy = jest
			.spyOn(process, "exit")
			.mockImplementation(((code?: number) => {
				throw new Error(`exit:${code}`);
			}) as never);

		await expect(runCommand({ command: "build" })).rejects.toThrow(
			/exit:1/,
		);

		exitSpy.mockRestore();
	});

	it("aborts build when tsconfig.build.json is malformed", async () => {
		fs.writeFileSync(
			path.join(tmpDir, "tsconfig.build.json"),
			"{not json",
		);
		const exitSpy = jest
			.spyOn(process, "exit")
			.mockImplementation(((code?: number) => {
				throw new Error(`exit:${code}`);
			}) as never);

		await expect(runCommand({ command: "build" })).rejects.toThrow(
			/exit:1/,
		);

		exitSpy.mockRestore();
	});

	it("aborts build when outDir is missing in tsconfig", async () => {
		fs.writeFileSync(
			path.join(tmpDir, "tsconfig.build.json"),
			JSON.stringify({ compilerOptions: {} }),
		);
		const exitSpy = jest
			.spyOn(process, "exit")
			.mockImplementation(((code?: number) => {
				throw new Error(`exit:${code}`);
			}) as never);

		await expect(runCommand({ command: "build" })).rejects.toThrow(
			/exit:1/,
		);

		exitSpy.mockRestore();
	});
});

describe("runCommand: prod", () => {
	beforeEach(() => {
		fs.writeFileSync(
			path.join(tmpDir, "tsconfig.build.json"),
			JSON.stringify({ compilerOptions: { outDir: "./dist" } }),
		);
	});

	it("invokes node on the compiled entrypoint", async () => {
		// First call clears the screen (cls/clear), second runs node.
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await runCommand({ command: "prod" });

		// We expect at least one call where node is invoked with the
		// compiled entrypoint path.
		const nodeCall = spawnMock.mock.calls.find(([cmd]) => {
			return typeof cmd === "string" && /^node$/.test(cmd);
		});
		expect(nodeCall).toBeDefined();
		const [, nodeArgs] = nodeCall as [string, string[]];
		expect(
			nodeArgs.some((a) => a.includes("./dist/src/main.js")),
		).toBe(true);
	});
});
