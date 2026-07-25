/**
 * Extended tests for project.commands (tsconfig resolution, path aliases, container dev).
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const spawnMock = jest.fn();

jest.mock("cross-spawn", () => {
	const fn = (...args: unknown[]) => spawnMock(...args);
	(fn as unknown as { sync: jest.Mock }).sync = jest.fn((...args: unknown[]) =>
		spawnMock(...args),
	);
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

import { devCommand, runCommand } from "../../src/commands/project.commands";

let originalCwd: string;
let tmpDir: string;

function makeFakeChildProcess(exitCode: number = 0) {
	const child = new EventEmitter() as EventEmitter & {
		stdout?: EventEmitter;
		stderr?: EventEmitter;
		pid?: number;
	};
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	child.pid = 4242;
	setImmediate(() => child.emit("close", exitCode));
	return child;
}

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-proj-ext-"));
	process.chdir(tmpDir);
	spawnMock.mockReset();
	loadConfigMock.mockReset();
	loadConfigMock.mockResolvedValue({
		opinionated: true,
		entryPoint: "main",
		sourceRoot: "api",
		scaffoldPattern: "kebab-case",
	});
	jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
	process.chdir(originalCwd);
	jest.restoreAllMocks();
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("runCommand extended", () => {
	beforeEach(() => {
		fs.writeFileSync(
			path.join(tmpDir, "tsconfig.build.json"),
			`{
  // project build config
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  }
}`,
		);
		fs.writeFileSync(
			path.join(tmpDir, "tsconfig.base.json"),
			JSON.stringify({
				compilerOptions: {
					baseUrl: "./src",
					paths: { "@util/*": ["util/*"] },
				},
			}),
		);
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify({ name: "alias-test" }),
		);
	});

	it("uses custom sourceRoot for dev entrypoint", async () => {
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await runCommand({ command: "dev" });

		const args = spawnMock.mock.calls[0][1] as string[];
		expect(args.some((a) => a.endsWith("./api/main.ts"))).toBe(true);
	});

	it("rewrites path aliases during build", async () => {
		spawnMock.mockImplementation(() => {
			const distDir = path.join(tmpDir, "dist", "api", "services");
			fs.mkdirSync(distDir, { recursive: true });
			fs.writeFileSync(
				path.join(distDir, "app.js"),
				'const x = require("@util/helper");',
			);
			return makeFakeChildProcess(0);
		});

		await runCommand({ command: "build" });

		const compiled = fs.readFileSync(
			path.join(tmpDir, "dist", "api", "services", "app.js"),
			"utf-8",
		);
		expect(compiled).not.toContain("@util/");
		expect(compiled).toContain("require(");
		expect(fs.existsSync(path.join(tmpDir, "dist", "package.json"))).toBe(true);
	});

	it("uses custom sourceRoot for prod entrypoint", async () => {
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await runCommand({ command: "prod" });

		const nodeCall = spawnMock.mock.calls.find(([cmd]) => cmd === "node");
		expect(nodeCall).toBeDefined();
		const [, nodeArgs] = nodeCall as [string, string[]];
		expect(nodeArgs.some((a) => a.includes("./dist/api/main.js"))).toBe(true);
	});

	it("ignores unknown commands after printing an error", async () => {
		await expect(runCommand({ command: "nope" })).resolves.toBeUndefined();
	});

	it("skips path-alias rewrite when opinionated mode is disabled", async () => {
		loadConfigMock.mockResolvedValue({
			opinionated: false,
			entryPoint: "main",
			sourceRoot: "src",
			scaffoldPattern: "kebab-case",
		});
		spawnMock.mockImplementation(() => {
			const distDir = path.join(tmpDir, "dist", "src");
			fs.mkdirSync(distDir, { recursive: true });
			fs.writeFileSync(
				path.join(distDir, "app.js"),
				'const x = require("@util/helper");',
			);
			return makeFakeChildProcess(0);
		});

		await runCommand({ command: "build" });

		const compiled = fs.readFileSync(
			path.join(tmpDir, "dist", "src", "app.js"),
			"utf-8",
		);
		expect(compiled).toContain("@util/helper");
	});
});

describe("devCommand container mode", () => {
	it("starts container dev when compose file exists and Docker is healthy", async () => {
		fs.writeFileSync(
			path.join(tmpDir, "docker-compose.development.yml"),
			"services:\n  app:\n    image: node\n",
		);
		fs.writeFileSync(path.join(tmpDir, "Dockerfile.development"), "FROM node:20\n");

		spawnMock.mockImplementation((cmd: string, args?: string[]) => {
			if (cmd === "docker" && args?.[0] === "info") {
				return { status: 0, error: null, stdout: "", stderr: "" };
			}
			if (cmd === "docker" && args?.[0] === "compose") {
				return { status: 0, error: null, stdout: "", stderr: "" };
			}
			return makeFakeChildProcess(0);
		});

		await devCommand.handler?.({
			_: [],
			$0: "expressots",
			container: true,
			build: false,
			detach: true,
		});

		const composeCall = spawnMock.mock.calls.find(
			([cmd, args]) => cmd === "docker" && args?.[0] === "compose",
		);
		expect(composeCall).toBeDefined();
	});

	it("runs local dev when container flag is false", async () => {
		fs.writeFileSync(
			path.join(tmpDir, "tsconfig.build.json"),
			JSON.stringify({ compilerOptions: { outDir: "./dist" } }),
		);
		spawnMock.mockReturnValue(makeFakeChildProcess(0));

		await devCommand.handler?.({
			_: [],
			$0: "expressots",
			container: false,
		});

		expect(spawnMock).toHaveBeenCalled();
		const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
		expect(cmd).toBe("tsx");
		expect(args[0]).toBe("watch");
	});
});
