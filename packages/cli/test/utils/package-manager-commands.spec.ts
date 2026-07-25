/**
 * Tests for the shared package-manager command helpers. These back the
 * unified lockfile detection used across the runtime commands (scripts,
 * providers add, studio) and the literal install/audit/run strings
 * emitted by the Docker, CI/CD and migration generators.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
	detectPackageManager,
	detectPackageManagerOrDefault,
	getAddPackageArgs,
	getAuditCommand,
	getCiInstallCommand,
	getExecCommand,
	getLockfileName,
	getRemovePackageArgs,
	getRunScriptCommand,
} from "../../src/utils/package-manager-commands";

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-pm-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function touch(file: string): void {
	fs.writeFileSync(path.join(tmpDir, file), "");
}

describe("detectPackageManager", () => {
	test.each([
		["pnpm-lock.yaml", "pnpm"],
		["yarn.lock", "yarn"],
		["bun.lock", "bun"],
		["bun.lockb", "bun"],
		["package-lock.json", "npm"],
	])("maps %s to %s", (lockfile, expected) => {
		touch(lockfile);
		expect(detectPackageManager(tmpDir)).toBe(expected);
	});

	test("returns null when no lockfile is present", () => {
		expect(detectPackageManager(tmpDir)).toBeNull();
	});

	test("prefers pnpm > yarn > bun > npm when several lockfiles coexist", () => {
		touch("package-lock.json");
		touch("bun.lock");
		touch("yarn.lock");
		touch("pnpm-lock.yaml");
		expect(detectPackageManager(tmpDir)).toBe("pnpm");
	});

	test("detectPackageManagerOrDefault falls back to npm", () => {
		expect(detectPackageManagerOrDefault(tmpDir)).toBe("npm");
		touch("bun.lock");
		expect(detectPackageManagerOrDefault(tmpDir)).toBe("bun");
	});
});

describe("getAddPackageArgs / getRemovePackageArgs", () => {
	test.each([
		["npm", ["install"], ["install", "--save-dev"], ["uninstall"]],
		["pnpm", ["add"], ["add", "--save-dev"], ["remove"]],
		["yarn", ["add"], ["add", "--dev"], ["remove"]],
		["bun", ["add"], ["add", "--dev"], ["remove"]],
	])("%s add/addDev/remove verbs", (pm, add, addDev, remove) => {
		expect(getAddPackageArgs(pm)).toEqual(add);
		expect(getAddPackageArgs(pm, { dev: true })).toEqual(addDev);
		expect(getRemovePackageArgs(pm)).toEqual(remove);
	});
});

describe("CI command helpers", () => {
	test("getCiInstallCommand uses frozen installs", () => {
		expect(getCiInstallCommand("npm")).toBe("npm ci");
		expect(getCiInstallCommand("pnpm")).toBe(
			"pnpm install --frozen-lockfile",
		);
		expect(getCiInstallCommand("yarn")).toBe(
			"yarn install --frozen-lockfile",
		);
		expect(getCiInstallCommand("bun")).toBe(
			"bun install --frozen-lockfile",
		);
	});

	test("getCiInstallCommand bootstraps Bun on Node-only runners", () => {
		expect(getCiInstallCommand("bun", { bootstrapBun: true })).toBe(
			"npm install -g bun && bun install --frozen-lockfile",
		);
		// Bootstrap only affects Bun; other managers are unchanged.
		expect(getCiInstallCommand("npm", { bootstrapBun: true })).toBe(
			"npm ci",
		);
	});

	test("getRunScriptCommand prepends the right runner", () => {
		expect(getRunScriptCommand("npm", "build")).toBe("npm run build");
		expect(getRunScriptCommand("pnpm", "build")).toBe("pnpm run build");
		expect(getRunScriptCommand("yarn", "build")).toBe("yarn build");
		expect(getRunScriptCommand("bun", "build")).toBe("bun run build");
	});

	test("getAuditCommand maps each pm to its audit invocation", () => {
		expect(getAuditCommand("npm")).toBe("npm audit --audit-level=high");
		expect(getAuditCommand("pnpm")).toBe("pnpm audit --audit-level high");
		expect(getAuditCommand("yarn")).toBe("yarn npm audit --severity high");
		expect(getAuditCommand("bun")).toBe("bun audit");
	});

	test("getLockfileName maps each pm to its lockfile", () => {
		expect(getLockfileName("npm")).toBe("package-lock.json");
		expect(getLockfileName("pnpm")).toBe("pnpm-lock.yaml");
		expect(getLockfileName("yarn")).toBe("yarn.lock");
		expect(getLockfileName("bun")).toBe("bun.lock");
	});
});

describe("getExecCommand", () => {
	test("resolves the local-binary runner per package manager", () => {
		// npm uses npx; the others use their own exec front-ends. Bun is
		// the critical case: `oven/bun` images ship `bunx` but not `npx`.
		expect(getExecCommand("npm", "tsc")).toEqual({
			command: "npx",
			args: ["tsc"],
		});
		expect(getExecCommand("pnpm", "tsc")).toEqual({
			command: "pnpm",
			args: ["exec", "tsc"],
		});
		expect(getExecCommand("yarn", "tsc")).toEqual({
			command: "yarn",
			args: ["tsc"],
		});
		expect(getExecCommand("bun", "tsc")).toEqual({
			command: "bunx",
			args: ["tsc"],
		});
	});

	test("forwards extra args after the binary", () => {
		expect(
			getExecCommand("npm", "tsc", ["-p", "tsconfig.build.json"]),
		).toEqual({
			command: "npx",
			args: ["tsc", "-p", "tsconfig.build.json"],
		});
		expect(
			getExecCommand("pnpm", "tsc", ["-p", "tsconfig.build.json"]),
		).toEqual({
			command: "pnpm",
			args: ["exec", "tsc", "-p", "tsconfig.build.json"],
		});
	});

	test("unknown managers fall back to npx", () => {
		expect(getExecCommand("unknown", "tsc")).toEqual({
			command: "npx",
			args: ["tsc"],
		});
	});
});
