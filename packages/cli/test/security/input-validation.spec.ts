/**
 * Security-focused tests for the input-validation utilities and the
 * path-traversal guard in the generator. These exist to make sure the
 * sanitization layer keeps rejecting the standard injection payloads
 * even if the regexes are tweaked later.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
	containsShellMetachars,
	isValidPackageManager,
	isValidPackageName,
	isValidScriptName,
	isValidVersion,
	safeResolveWithin,
	assertValidPackageName,
	assertValidVersion,
	assertValidScriptName,
} from "../../src/utils/input-validation";

describe("containsShellMetachars", () => {
	const malicious = [
		"foo;bar",
		"foo&&bar",
		"foo|bar",
		"foo`whoami`",
		"foo$(id)",
		"foo>out",
		"foo<in",
		"foo\nbar",
		"foo\\bar",
		"foo'bar",
		'foo"bar',
		"foo*bar",
		"foo?bar",
		"foo{a,b}",
		"foo[a]",
		"foo!bar",
		"foo#bar",
		"foo~bar",
	];

	it.each(malicious)("flags %p as containing shell metachars", (s) => {
		expect(containsShellMetachars(s)).toBe(true);
	});

	it("does not flag plain identifiers", () => {
		expect(containsShellMetachars("plain-name")).toBe(false);
		expect(containsShellMetachars("scoped/name")).toBe(false);
		expect(containsShellMetachars("v1.2.3-beta+build")).toBe(false);
	});
});

describe("isValidPackageName", () => {
	const valid = [
		"axios",
		"@expressots/cache",
		"@expressots/some-pkg",
		"my-pkg.foo",
		"a",
		"foo123",
		"@scope/pkg-1.0",
	];

	it.each(valid)("accepts %p", (n) => {
		expect(isValidPackageName(n)).toBe(true);
	});

	const invalid = [
		"",
		" axios",
		"axios ",
		"AXIOS",
		"@scope/UPPER",
		"axios; rm -rf /",
		"axios && curl evil",
		"$(rm -rf ~)",
		"`whoami`",
		"foo|bar",
		".hidden",
		"@scope",
		"@/pkg",
		"a".repeat(215), // too long
	];

	it.each(invalid)("rejects %p", (n) => {
		expect(isValidPackageName(n)).toBe(false);
	});

	it("rejects non-string inputs", () => {
		expect(isValidPackageName(null)).toBe(false);
		expect(isValidPackageName(undefined)).toBe(false);
		expect(isValidPackageName(42)).toBe(false);
		expect(isValidPackageName({})).toBe(false);
	});
});

describe("isValidVersion", () => {
	const valid = [
		"1.0.0",
		"1.2.3-beta.1",
		"^1.0.0",
		"~1",
		"latest",
		"next",
		">=1.2.3 <2.0.0",
		"1.x",
		"*",
	];

	it.each(valid)("accepts %p", (v) => {
		expect(isValidVersion(v)).toBe(true);
	});

	const invalid = [
		"",
		"1.0.0; ls",
		"1.0.0 && curl",
		"$(id)",
		"`whoami`",
		"v\nnext-line",
		"a".repeat(65),
	];

	it.each(invalid)("rejects %p", (v) => {
		expect(isValidVersion(v)).toBe(false);
	});

	it("rejects non-string inputs", () => {
		expect(isValidVersion(null)).toBe(false);
		expect(isValidVersion(undefined)).toBe(false);
		expect(isValidVersion(false)).toBe(false);
	});
});

describe("isValidScriptName", () => {
	const valid = [
		"build",
		"test:unit",
		"lint:fix",
		"docs.generate",
		"build/all",
		"a",
	];

	it.each(valid)("accepts %p", (n) => {
		expect(isValidScriptName(n)).toBe(true);
	});

	const invalid = [
		"",
		" build",
		"build script",
		"build;ls",
		"build&&ls",
		"build`whoami`",
		"$(id)",
		":lead-colon",
	];

	it.each(invalid)("rejects %p", (n) => {
		expect(isValidScriptName(n)).toBe(false);
	});
});

describe("isValidPackageManager", () => {
	it.each(["npm", "yarn", "pnpm", "bun"])("accepts %s", (pm) => {
		expect(isValidPackageManager(pm)).toBe(true);
	});

	it("rejects everything else", () => {
		expect(isValidPackageManager("brew")).toBe(false);
		expect(isValidPackageManager("npm; ls")).toBe(false);
		expect(isValidPackageManager("")).toBe(false);
		expect(isValidPackageManager(undefined)).toBe(false);
		expect(isValidPackageManager(null)).toBe(false);
	});
});

describe("safeResolveWithin", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-sec-"));
	});

	afterEach(() => {
		try {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	});

	it("resolves nested children", () => {
		const out = safeResolveWithin(tmpDir, "a/b/c.ts");
		expect(out).not.toBeNull();
		expect(out!.startsWith(path.resolve(tmpDir))).toBe(true);
	});

	it("rejects parent-traversal", () => {
		expect(safeResolveWithin(tmpDir, "../etc/passwd")).toBeNull();
	});

	it("rejects deeply-nested traversal", () => {
		expect(
			safeResolveWithin(tmpDir, "a/b/../../../escape"),
		).toBeNull();
	});

	it("returns the base path itself when target is empty/`.`", () => {
		const out = safeResolveWithin(tmpDir, ".");
		expect(out).toBe(path.resolve(tmpDir));
	});

	it("rejects sibling-directory escape", () => {
		const sibling = path.join(tmpDir, "..", "sibling");
		// Direct absolute target outside base
		expect(safeResolveWithin(tmpDir, sibling)).toBeNull();
	});
});

describe("assert helpers", () => {
	it("assertValidPackageName throws on invalid input", () => {
		expect(() => assertValidPackageName("foo; bar")).toThrow(/Invalid/);
	});

	it("assertValidPackageName passes on valid input", () => {
		expect(() => assertValidPackageName("@scope/pkg")).not.toThrow();
	});

	it("assertValidVersion throws on invalid input", () => {
		expect(() => assertValidVersion("$(id)")).toThrow(/Invalid/);
	});

	it("assertValidScriptName throws on invalid input", () => {
		expect(() => assertValidScriptName("build; ls")).toThrow(/Invalid/);
	});
});

describe("path traversal in generate command", () => {
	let originalCwd: string;
	let tmpDir: string;

	beforeEach(() => {
		originalCwd = process.cwd();
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-trav-"));
		process.chdir(tmpDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		try {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	});

	// We import lazily inside the test block so the mocks below apply.
	function loadCreateTemplate() {
		jest.resetModules();
		jest.doMock("../../src/utils/compiler", () => ({
			__esModule: true,
			default: {
				loadConfig: jest.fn().mockResolvedValue({
					sourceRoot: "src",
					opinionated: true,
					scaffoldPattern: "kebab-case",
					scaffoldSchematics: undefined,
				}),
			},
		}));
		jest.doMock("../../src/utils/update-tsconfig-paths", () => ({
			updateTsconfigPaths: jest.fn().mockResolvedValue(undefined),
			generatePathAlias: jest.fn((f: string) => `@${f}`),
		}));
		jest.doMock("../../src/utils/verify-file-exists", () => ({
			verifyIfFileExists: jest.fn().mockResolvedValue(undefined),
		}));
		// Use the project-relative path; the require is local to this
		// closure so the mocks above bind correctly.
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require("../../src/generate/form").createTemplate;
	}

	it("rejects an absolute target", async () => {
		const createTemplate = loadCreateTemplate();
		const exitSpy = jest
			.spyOn(process, "exit")
			.mockImplementation(((code?: number) => {
				throw new Error(`exit:${code}`);
			}) as never);

		const absTarget =
			process.platform === "win32" ? "C:\\evil\\file" : "/etc/evil";

		await expect(
			createTemplate({
				schematic: "controller",
				path: absTarget,
				method: "get",
			}),
		).rejects.toThrow(/exit:1/);

		exitSpy.mockRestore();
	});
});
