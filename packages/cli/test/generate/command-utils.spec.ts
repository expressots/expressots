/**
 * Tests for `src/generate/utils/command-utils.ts`. We focus on the
 * pure helpers (`splitTarget`, `checkPathStyle`, `schematicFolder`,
 * `getHttpMethod`, `getFileNameWithoutExtension`) and the exported
 * `PathStyle` enum. The functions that touch fs (`writeTemplate`,
 * `validateAndPrepareFile`) are exercised through generator tests.
 *
 * `splitTarget` and `getNameWithScaffoldPattern` both load
 * `expressots.config.ts` via the singleton `Compiler`. We mock the
 * Compiler in this suite so tests stay hermetic.
 */

jest.mock("../../src/utils/compiler", () => {
	const Pattern = {
		LOWER_CASE: "lowercase",
		KEBAB_CASE: "kebab-case",
		PASCAL_CASE: "pascalcase",
		CAMEL_CASE: "camelcase",
	};
	return {
		__esModule: true,
		default: {
			loadConfig: jest.fn().mockResolvedValue({
				sourceRoot: "src",
				opinionated: true,
				scaffoldPattern: Pattern.KEBAB_CASE,
				scaffoldSchematics: undefined,
			}),
		},
	};
});

import {
	checkPathStyle,
	getFileNameWithoutExtension,
	getHttpMethod,
	PathStyle,
	schematicFolder,
	splitTarget,
} from "../../src/generate/utils/command-utils";

describe("getHttpMethod", () => {
	it.each([
		["get", "Get"],
		["put", "Put"],
		["post", "Post"],
		["patch", "Patch"],
		["delete", "Delete"],
	])("maps %s to %s", (input, expected) => {
		expect(getHttpMethod(input)).toBe(expected);
	});

	it("defaults to Get for unknown values", () => {
		expect(getHttpMethod("trace")).toBe("Get");
		expect(getHttpMethod("")).toBe("Get");
	});
});

describe("getFileNameWithoutExtension", () => {
	it("strips the first dotted segment onwards", () => {
		expect(getFileNameWithoutExtension("user.controller.ts")).toBe("user");
	});

	it("returns input unchanged when no dot present", () => {
		expect(getFileNameWithoutExtension("user")).toBe("user");
	});
});

describe("checkPathStyle", () => {
	it("classifies single-token names as Single", () => {
		expect(checkPathStyle("user")).toBe(PathStyle.Single);
	});

	it("classifies sugar names (foo-bar with no slash) as Sugar", () => {
		expect(checkPathStyle("user-profile")).toBe(PathStyle.Sugar);
	});

	it("classifies forward-slash paths as Nested", () => {
		expect(checkPathStyle("auth/login")).toBe(PathStyle.Nested);
	});

	it("classifies backslash paths as Nested", () => {
		expect(checkPathStyle("auth\\login")).toBe(PathStyle.Nested);
	});
});

describe("schematicFolder", () => {
	it("returns default folders for known schematics", () => {
		expect(schematicFolder("usecase")).toBe("useCases");
		expect(schematicFolder("controller")).toBe("useCases");
		expect(schematicFolder("provider")).toBe("providers");
		expect(schematicFolder("entity")).toBe("entities");
		expect(schematicFolder("middleware")).toBe("middleware");
	});

	it("returns v4 schematic folders", () => {
		expect(schematicFolder("interceptor")).toBe("interceptors");
		expect(schematicFolder("event")).toBe("events");
		expect(schematicFolder("handler")).toBe("events");
		expect(schematicFolder("guard")).toBe("guards");
		expect(schematicFolder("config")).toBe("config");
	});

	it("respects custom scaffoldSchematics overrides", () => {
		expect(
			schematicFolder("usecase", {
				usecase: "myUseCases",
			} as never),
		).toBe("myUseCases");
	});

	it("returns undefined for unknown schematics with no override", () => {
		expect(schematicFolder("nope")).toBeUndefined();
	});
});

describe("splitTarget", () => {
	it("returns single-token target as kebab folder + class name", async () => {
		const result = await splitTarget({
			target: "user",
			schematic: "controller",
		});
		expect(result.path).toBe("user");
		expect(result.file).toBe("user.controller.ts");
		expect(result.className).toBe("User");
		expect(result.moduleName).toBe("user");
	});

	it("derives kebab folder from compound camelCase target", async () => {
		const result = await splitTarget({
			target: "userProfile",
			schematic: "controller",
		});
		expect(result.path).toBe("user-profile");
		expect(result.className).toBe("UserProfile");
		expect(result.moduleName).toBe("user");
	});

	it("derives kebab folder from kebab-case compound", async () => {
		const result = await splitTarget({
			target: "user-profile",
			schematic: "controller",
		});
		expect(result.path).toBe("user-profile");
		expect(result.className).toBe("UserProfile");
	});

	it("treats nested path with slash by collapsing to module-style path", async () => {
		const result = await splitTarget({
			target: "auth/login",
			schematic: "controller",
		});
		expect(result.path).toBe("auth");
		expect(result.file).toBe("login.controller.ts");
		expect(result.className).toBe("Login");
	});

	it("rejects controller paths deeper than 4 segments via process.exit", async () => {
		const exitSpy = jest
			.spyOn(process, "exit")
			.mockImplementation(((code?: number) => {
				throw new Error(`exit:${code}`);
			}) as never);

		await expect(
			splitTarget({
				target: "a/b/c/d/e/file",
				schematic: "service",
			}),
		).rejects.toThrow(/exit:1/);

		exitSpy.mockRestore();
	});

	it("does not create a folder for standalone schematics with bare names", async () => {
		const result = await splitTarget({
			target: "user",
			schematic: "provider",
		});
		expect(result.path).toBe("");
		expect(result.file).toBe("user.provider.ts");
	});
});
