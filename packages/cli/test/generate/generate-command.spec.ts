/**
 * Integration tests for the `generate` command. We exercise the
 * `createTemplate` orchestrator (which dispatches to opinionated or
 * non-opinionated processors) for every v4 schematic in both modes.
 *
 * Each test runs in an isolated temp directory so the generated files
 * never leak into the repo. We mock the singleton `Compiler` so it
 * returns a fixed `ExpressoConfig` instead of trying to compile a
 * real `expressots.config.ts`.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const Pattern = {
	LOWER_CASE: "lowercase",
	KEBAB_CASE: "kebab-case",
	PASCAL_CASE: "pascalcase",
	CAMEL_CASE: "camelcase",
};

const loadConfigMock = jest.fn();

jest.mock("../../src/utils/compiler", () => {
	return {
		__esModule: true,
		default: {
			loadConfig: () => loadConfigMock(),
		},
	};
});

// Skip the path-alias rewrite step (it touches tsconfig.json on disk).
jest.mock("../../src/utils/update-tsconfig-paths", () => ({
	updateTsconfigPaths: jest.fn().mockResolvedValue(undefined),
	generatePathAlias: jest.fn((f: string) => `@${f}`),
}));

// File-overwrite prompt would block the suite; bypass it.
jest.mock("../../src/utils/verify-file-exists", () => ({
	verifyIfFileExists: jest.fn().mockResolvedValue(undefined),
}));

import { createTemplate } from "../../src/generate/form";

const SCHEMATICS_OPINIONATED: Array<{
	schematic: string;
	target: string;
	method: string;
	expectedFolder: string;
	expectedFileSuffix: string;
}> = [
	{ schematic: "usecase", target: "user", method: "get", expectedFolder: "useCases", expectedFileSuffix: ".usecase.ts" },
	{ schematic: "controller", target: "user", method: "get", expectedFolder: "useCases", expectedFileSuffix: ".controller.ts" },
	{ schematic: "dto", target: "user", method: "get", expectedFolder: "useCases", expectedFileSuffix: ".dto.ts" },
	{ schematic: "provider", target: "user", method: "get", expectedFolder: "providers", expectedFileSuffix: ".provider.ts" },
	{ schematic: "entity", target: "user", method: "get", expectedFolder: "entities", expectedFileSuffix: ".entity.ts" },
	{ schematic: "middleware", target: "user", method: "get", expectedFolder: "middleware", expectedFileSuffix: ".middleware.ts" },
	{ schematic: "module", target: "user", method: "get", expectedFolder: "useCases", expectedFileSuffix: ".module.ts" },
	{ schematic: "interceptor", target: "auth", method: "get", expectedFolder: "interceptors", expectedFileSuffix: ".interceptor.ts" },
	{ schematic: "event", target: "user-created", method: "get", expectedFolder: "events", expectedFileSuffix: ".event.ts" },
	{ schematic: "handler", target: "send-welcome", method: "get", expectedFolder: "events", expectedFileSuffix: ".handler.ts" },
	{ schematic: "guard", target: "auth", method: "get", expectedFolder: "guards", expectedFileSuffix: ".guard.ts" },
	{ schematic: "config", target: "database", method: "get", expectedFolder: "config", expectedFileSuffix: ".config.ts" },
];

const SCHEMATICS_NON_OPINIONATED: Array<{
	schematic: string;
	target: string;
	method: string;
	expectedFileSuffix: string;
}> = [
	{ schematic: "usecase", target: "user", method: "get", expectedFileSuffix: ".usecase.ts" },
	{ schematic: "controller", target: "user", method: "get", expectedFileSuffix: ".controller.ts" },
	{ schematic: "dto", target: "user", method: "get", expectedFileSuffix: ".dto.ts" },
	{ schematic: "provider", target: "user", method: "get", expectedFileSuffix: ".provider.ts" },
	{ schematic: "entity", target: "user", method: "get", expectedFileSuffix: ".entity.ts" },
	{ schematic: "middleware", target: "user", method: "get", expectedFileSuffix: ".middleware.ts" },
	{ schematic: "module", target: "user", method: "get", expectedFileSuffix: ".module.ts" },
	{ schematic: "interceptor", target: "auth", method: "get", expectedFileSuffix: ".interceptor.ts" },
	{ schematic: "event", target: "user-created", method: "get", expectedFileSuffix: ".event.ts" },
	{ schematic: "handler", target: "send-welcome", method: "get", expectedFileSuffix: ".handler.ts" },
	{ schematic: "guard", target: "auth", method: "get", expectedFileSuffix: ".guard.ts" },
	{ schematic: "config", target: "database", method: "get", expectedFileSuffix: ".config.ts" },
];

let originalCwd: string;
let tmpDir: string;

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-gen-"));
	process.chdir(tmpDir);
	loadConfigMock.mockReset();
});

afterEach(() => {
	process.chdir(originalCwd);
	try {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	} catch {
		// best-effort
	}
});

describe("generate (opinionated)", () => {
	beforeEach(() => {
		loadConfigMock.mockResolvedValue({
			sourceRoot: "src",
			opinionated: true,
			scaffoldPattern: Pattern.KEBAB_CASE,
			scaffoldSchematics: undefined,
		});
	});

	it.each(SCHEMATICS_OPINIONATED)(
		"creates %s under expected folder",
		async ({ schematic, target, method, expectedFolder, expectedFileSuffix }) => {
			await createTemplate({ schematic, path: target, method });

			const folder = path.join(tmpDir, "src", expectedFolder);
			expect(fs.existsSync(folder)).toBe(true);

			// Walk the folder tree to find the generated file.
			const found = walkAndFind(folder, (name) =>
				name.endsWith(expectedFileSuffix),
			);
			expect(found).not.toBeNull();
			const content = fs.readFileSync(found as string, "utf-8");
			expect(content.length).toBeGreaterThan(0);
		},
	);
});

describe("generate (non-opinionated)", () => {
	beforeEach(() => {
		loadConfigMock.mockResolvedValue({
			sourceRoot: "src",
			opinionated: false,
			scaffoldPattern: Pattern.KEBAB_CASE,
			scaffoldSchematics: undefined,
		});
	});

	it.each(SCHEMATICS_NON_OPINIONATED)(
		"creates %s file",
		async ({ schematic, target, method, expectedFileSuffix }) => {
			await createTemplate({ schematic, path: target, method });

			const found = walkAndFind(path.join(tmpDir, "src"), (name) =>
				name.endsWith(expectedFileSuffix),
			);
			expect(found).not.toBeNull();
			const content = fs.readFileSync(found as string, "utf-8");
			expect(content.length).toBeGreaterThan(0);
		},
	);
});

describe("generate (v4-specific options)", () => {
	beforeEach(() => {
		loadConfigMock.mockResolvedValue({
			sourceRoot: "src",
			opinionated: true,
			scaffoldPattern: Pattern.KEBAB_CASE,
			scaffoldSchematics: undefined,
		});
	});

	it("interceptor renders the supplied priority", async () => {
		await createTemplate({
			schematic: "interceptor",
			path: "rate-limit",
			method: "get",
			priority: 7,
		});
		const found = walkAndFind(
			path.join(tmpDir, "src", "interceptors"),
			(name) => name.endsWith(".interceptor.ts"),
		);
		expect(found).not.toBeNull();
		const content = fs.readFileSync(found as string, "utf-8");
		expect(content).toContain("7");
	});

	it("handler binds to the supplied event name", async () => {
		await createTemplate({
			schematic: "handler",
			path: "notify",
			method: "get",
			event: "OrderPlaced",
			priority: 3,
		});
		const found = walkAndFind(
			path.join(tmpDir, "src", "events"),
			(name) => name.endsWith(".handler.ts"),
		);
		expect(found).not.toBeNull();
		const content = fs.readFileSync(found as string, "utf-8");
		expect(content).toContain("OrderPlaced");
		expect(content).toContain("3");
	});
});

function walkAndFind(
	root: string,
	predicate: (name: string) => boolean,
): string | null {
	if (!fs.existsSync(root)) return null;
	const entries = fs.readdirSync(root, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(root, entry.name);
		if (entry.isDirectory()) {
			const nested = walkAndFind(full, predicate);
			if (nested) return nested;
		} else if (predicate(entry.name)) {
			return full;
		}
	}
	return null;
}
