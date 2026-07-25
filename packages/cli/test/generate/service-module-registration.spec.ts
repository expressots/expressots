/**
 * Regression tests for opinionated `g service` module registration.
 *
 * The bug: the import written into `app.ts` was reconstructed heuristically and
 * could point to a different location than where the module file was actually
 * written (e.g. file at `src/useCases/user-create/user.module.ts` but import
 * `@useCases/user.module`), producing a runtime `Cannot find module` error.
 *
 * These tests scaffold a service in every path style and assert that the import
 * emitted into `app.ts` resolves (via the `@useCases` alias) to the real module
 * file on disk.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const loadConfigMock = jest.fn();

jest.mock("../../src/utils/compiler", () => ({
	__esModule: true,
	default: {
		loadConfig: () => loadConfigMock(),
	},
}));

jest.mock("../../src/utils/update-tsconfig-paths", () => ({
	updateTsconfigPaths: jest.fn().mockResolvedValue(undefined),
	generatePathAlias: jest.fn((f: string) => `@${f}`),
	getPathAliasForFolder: jest.fn((f: string) => `@${f}`),
}));

jest.mock("../../src/utils/verify-file-exists", () => ({
	verifyIfFileExists: jest.fn().mockResolvedValue(undefined),
}));

import { createTemplate } from "../../src/generate/form";

const APP_CONTAINER = `import { AppExpress } from "@expressots/adapter-express";

export class App extends AppExpress {
	protected configureServices(): void {
		this.configContainer([]);
	}
}
`;

let originalCwd: string;
let tmpDir: string;

function writeAppContainer(): void {
	const srcDir = path.join(tmpDir, "src");
	fs.mkdirSync(srcDir, { recursive: true });
	fs.writeFileSync(path.join(srcDir, "app.ts"), APP_CONTAINER, "utf-8");
}

/**
 * Resolve an `@useCases/...` import specifier to a real path under `src` and
 * confirm the corresponding `.ts` file exists.
 */
function importResolvesToFile(importSpec: string): boolean {
	const withoutAlias = importSpec.replace(/^@useCases\//, "useCases/");
	const resolved = path.join(tmpDir, "src", `${withoutAlias}.ts`);
	return fs.existsSync(resolved);
}

function readModuleImportSpec(): string | null {
	const appContent = fs.readFileSync(
		path.join(tmpDir, "src", "app.ts"),
		"utf-8",
	);
	const match = appContent.match(
		/import\s*\{\s*\w+Module\s*\}\s*from\s*"([^"]+)";/,
	);
	return match ? match[1] : null;
}

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-svc-"));
	process.chdir(tmpDir);
	loadConfigMock.mockReset();
	loadConfigMock.mockResolvedValue({
		sourceRoot: "src",
		opinionated: true,
		scaffoldPattern: "kebab-case",
		scaffoldSchematics: undefined,
	});
	writeAppContainer();
});

afterEach(() => {
	process.chdir(originalCwd);
	try {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	} catch {
		// best-effort
	}
});

describe("service module registration (app.ts import matches file)", () => {
	const cases: Array<{ name: string; target: string; expectedModule: string }> =
		[
			// Single path style (camelCase compound name).
			{ name: "single (camelCase)", target: "userCreate", expectedModule: "UserModule" },
			// Sugar path style (kebab compound name).
			{ name: "sugar (kebab-case)", target: "user-create", expectedModule: "UserModule" },
			// Nested path style (explicit slash) groups under the parent folder.
			{ name: "nested (slash)", target: "billing/invoice", expectedModule: "BillingModule" },
		];

	it.each(cases)(
		"$name: import resolves to the generated module file",
		async ({ target, expectedModule }) => {
			await createTemplate({
				schematic: "service",
				path: target,
				method: "get",
			});

			const importSpec = readModuleImportSpec();
			expect(importSpec).not.toBeNull();
			expect(importResolvesToFile(importSpec as string)).toBe(true);

			const appContent = fs.readFileSync(
				path.join(tmpDir, "src", "app.ts"),
				"utf-8",
			);
			expect(appContent).toContain(`${expectedModule}`);
		},
	);
});

describe("sibling resources group into a single module (no duplicates)", () => {
	const groupings: Array<{
		name: string;
		first: string;
		second: string;
		module: string;
	}> = [
		// camelCase compound names must group exactly like their kebab form.
		{ name: "single/camelCase", first: "userCreate", second: "userUpdate", module: "UserModule" },
		{ name: "sugar/kebab-case", first: "user-create", second: "user-update", module: "UserModule" },
		{ name: "nested/slash", first: "billing/invoice", second: "billing/payment", module: "BillingModule" },
	];

	it.each(groupings)(
		"$name: two resources share one $module",
		async ({ first, second, module }) => {
			await createTemplate({ schematic: "service", path: first, method: "get" });
			await createTemplate({ schematic: "service", path: second, method: "get" });

			const appContent = fs.readFileSync(
				path.join(tmpDir, "src", "app.ts"),
				"utf-8",
			);

			// Exactly one import of the shared module (no duplicate identifier).
			const importCount = (
				appContent.match(
					new RegExp(`import\\s*\\{\\s*${module}\\s*\\}`, "g"),
				) ?? []
			).length;
			expect(importCount).toBe(1);

			// Exactly one occurrence in the configContainer array.
			const arrayMatch = appContent.match(/configContainer\(\[([^\]]*)\]/);
			expect(arrayMatch).not.toBeNull();
			const entries = (arrayMatch as RegExpMatchArray)[1]
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			expect(entries.filter((e) => e === module)).toHaveLength(1);

			// The shared module import still resolves to a real file.
			const importSpec = readModuleImportSpec();
			expect(importResolvesToFile(importSpec as string)).toBe(true);
		},
	);
});
