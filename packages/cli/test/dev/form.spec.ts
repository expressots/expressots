/**
 * Unit tests for container-dev form helpers (docker-compose orchestration).
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { EventEmitter } from "events";

const execSyncMock = jest.fn();
const spawnMock = jest.fn();

jest.mock("child_process", () => ({
	execSync: (...args: unknown[]) => execSyncMock(...args),
	spawn: (...args: unknown[]) => spawnMock(...args),
}));

import {
	attachToContainer,
	openShell,
	showLogs,
	showStatus,
	startDevContainer,
	stopDevContainer,
	type DevOptions,
} from "../../src/dev/form";

const baseOptions: DevOptions = {
	container: true,
	service: "app",
	composeFile: "docker-compose.development.yml",
	build: false,
	detach: true,
	debugPort: 9229,
	watch: true,
	follow: true,
	tail: 50,
};

let originalCwd: string;
let tmpDir: string;
let logSpy: jest.SpyInstance;

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-dev-form-"));
	process.chdir(tmpDir);
	logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
	execSyncMock.mockReset();
	spawnMock.mockReset();
});

afterEach(() => {
	process.chdir(originalCwd);
	logSpy.mockRestore();
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("dev/form", () => {
	it("startDevContainer exits early when compose file is missing", async () => {
		await startDevContainer(baseOptions);

		expect(execSyncMock).not.toHaveBeenCalled();
		expect(logSpy.mock.calls.some((c) => String(c[0]).includes("not found"))).toBe(
			true,
		);
	});

	it("startDevContainer exits when Docker is not running", async () => {
		fs.writeFileSync(
			path.join(tmpDir, baseOptions.composeFile),
			"services: {}\n",
		);
		execSyncMock.mockImplementation(() => {
			throw new Error("docker not running");
		});

		await startDevContainer(baseOptions);

		expect(logSpy.mock.calls.some((c) => String(c[0]).includes("Docker is not running"))).toBe(
			true,
		);
	});

	it("startDevContainer runs compose up in detached mode", async () => {
		fs.writeFileSync(
			path.join(tmpDir, baseOptions.composeFile),
			"services: {}\n",
		);
		execSyncMock.mockImplementation(() => "ok");

		await startDevContainer({ ...baseOptions, build: true });

		expect(execSyncMock).toHaveBeenCalled();
		const calls = execSyncMock.mock.calls.map((c) => String(c[0]));
		expect(calls.some((c) => c.includes("docker compose") && c.includes("build"))).toBe(
			true,
		);
		expect(calls.some((c) => c.includes("docker compose") && c.includes("up"))).toBe(
			true,
		);
		expect(calls.some((c) => c.includes("-d"))).toBe(true);
	});

	it("stopDevContainer uses default compose when dev file is missing", async () => {
		fs.writeFileSync(path.join(tmpDir, "docker-compose.yml"), "services: {}\n");
		execSyncMock.mockImplementation(() => "ok");

		await stopDevContainer(baseOptions);

		const call = String(execSyncMock.mock.calls[0][0]);
		expect(call).toContain("docker-compose.yml");
		expect(call).toContain("down");
	});

	it("attachToContainer reports missing compose file", async () => {
		await attachToContainer(baseOptions);
		expect(logSpy.mock.calls.some((c) => String(c[0]).includes("not found"))).toBe(
			true,
		);
	});

	it("openShell spawns compose exec when compose file exists", async () => {
		fs.writeFileSync(
			path.join(tmpDir, baseOptions.composeFile),
			"services: {}\n",
		);
		spawnMock.mockReturnValue(new EventEmitter());

		await openShell(baseOptions);

		expect(spawnMock).toHaveBeenCalledWith(
			"docker",
			[
				"compose",
				"-f",
				path.join(tmpDir, baseOptions.composeFile),
				"exec",
				"app",
				"sh",
			],
			expect.objectContaining({ stdio: "inherit" }),
		);
	});

	it("showStatus runs compose ps and docker stats", async () => {
		fs.writeFileSync(
			path.join(tmpDir, baseOptions.composeFile),
			"services: {}\n",
		);
		execSyncMock.mockImplementation(() => "stats table");

		await showStatus(baseOptions);

		expect(execSyncMock.mock.calls.length).toBeGreaterThanOrEqual(2);
	});

	it("showLogs spawns compose logs with tail and follow", async () => {
		fs.writeFileSync(
			path.join(tmpDir, baseOptions.composeFile),
			"services: {}\n",
		);
		spawnMock.mockReturnValue(new EventEmitter());

		await showLogs(baseOptions);

		expect(spawnMock).toHaveBeenCalledWith(
			"docker",
			expect.arrayContaining([
				"compose",
				"-f",
				path.join(tmpDir, baseOptions.composeFile),
				"logs",
				"-f",
				"--tail",
				"50",
				"app",
			]),
			expect.any(Object),
		);
	});
});
