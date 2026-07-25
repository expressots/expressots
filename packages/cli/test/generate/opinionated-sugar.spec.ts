/**
 * Opinionated "syntactic sugar" scaffolding.
 *
 * `g s userLogin` must expand into a nested feature/use-case layout:
 *
 *   useCases/user/
 *     user.module.ts            (UserModule)
 *     login/
 *       login.controller.ts     (LoginController)
 *       login.usecase.ts
 *       login.dto.ts
 *
 * A later `g s userLogout` adds `user/logout/...` and joins the SAME UserModule.
 *
 * Non-opinionated mode keeps the flat folder and never edits app.ts.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const loadConfigMock = jest.fn();

jest.mock("../../src/utils/compiler", () => ({
	__esModule: true,
	default: { loadConfig: () => loadConfigMock() },
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

const APP = `import { AppExpress } from "@expressots/adapter-express";

export class App extends AppExpress {
	protected configureServices(): void {
		this.configContainer([]);
	}
}
`;

let originalCwd: string;
let tmpDir: string;

function setup(opinionated: boolean): void {
	loadConfigMock.mockReset();
	loadConfigMock.mockResolvedValue({
		sourceRoot: "src",
		opinionated,
		scaffoldPattern: "kebab-case",
		scaffoldSchematics: undefined,
	});
}

function read(rel: string): string {
	return fs.readFileSync(path.join(tmpDir, rel), "utf8");
}

function exists(rel: string): boolean {
	return fs.existsSync(path.join(tmpDir, rel));
}

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sugar-"));
	process.chdir(tmpDir);
	fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
	fs.writeFileSync(path.join(tmpDir, "src", "app.ts"), APP);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("opinionated sugar: g s userLogin", () => {
	beforeEach(() => setup(true));

	it("nests assets under user/login and places the module at the feature root", async () => {
		await createTemplate({ schematic: "service", path: "userLogin", method: "get" });

		expect(exists("src/useCases/user/login/login.controller.ts")).toBe(true);
		expect(exists("src/useCases/user/login/login.usecase.ts")).toBe(true);
		expect(exists("src/useCases/user/login/login.dto.ts")).toBe(true);
		expect(exists("src/useCases/user/user.module.ts")).toBe(true);

		const moduleSrc = read("src/useCases/user/user.module.ts");
		expect(moduleSrc).toContain("export const UserModule");
		expect(moduleSrc).toContain(
			'import { LoginController } from "./login/login.controller"',
		);
		expect(moduleSrc).toContain("CreateModule([LoginController])");

		const controllerSrc = read(
			"src/useCases/user/login/login.controller.ts",
		);
		expect(controllerSrc).toContain("class LoginController");

		const app = read("src/app.ts");
		expect(app).toContain(
			'import { UserModule } from "@useCases/user/user.module"',
		);
		expect(app).toContain("configContainer([UserModule])");
	});

	it("groups a sibling use-case (userLogout) into the same UserModule", async () => {
		await createTemplate({ schematic: "service", path: "userLogin", method: "get" });
		await createTemplate({ schematic: "service", path: "userLogout", method: "get" });

		expect(exists("src/useCases/user/logout/logout.controller.ts")).toBe(true);
		// Still exactly one module file for the feature.
		expect(exists("src/useCases/user/user.module.ts")).toBe(true);
		expect(exists("src/useCases/user/logout/logout.module.ts")).toBe(false);

		const moduleSrc = read("src/useCases/user/user.module.ts");
		expect(moduleSrc).toContain(
			'import { LoginController } from "./login/login.controller"',
		);
		expect(moduleSrc).toContain(
			'import { LogoutController } from "./logout/logout.controller"',
		);
		expect(moduleSrc).toMatch(
			/CreateModule\(\[\s*LoginController,\s*LogoutController\s*\]\)/,
		);

		const app = read("src/app.ts");
		const imports = app.match(/import \{ UserModule \}/g) ?? [];
		expect(imports).toHaveLength(1);
		const arr = (app.match(/configContainer\(\[([^\]]*)\]/) as RegExpMatchArray)[1];
		expect(arr.split(",").map((s) => s.trim()).filter(Boolean)).toEqual([
			"UserModule",
		]);
	});
});

describe("non-opinionated: g s userLogin stays flat and untouched", () => {
	beforeEach(() => setup(false));

	it("creates a flat folder and does not edit app.ts", async () => {
		await createTemplate({ schematic: "service", path: "userLogin", method: "get" });

		expect(exists("src/user-login/user-login.controller.ts")).toBe(true);
		expect(exists("src/user-login/user-login.usecase.ts")).toBe(true);
		expect(exists("src/user-login/user-login.dto.ts")).toBe(true);
		expect(exists("src/user-login/user-login.module.ts")).toBe(true);

		// No nested feature folder.
		expect(exists("src/useCases/user/login/login.controller.ts")).toBe(false);

		// app.ts untouched.
		expect(read("src/app.ts")).toBe(APP);
	});
});
