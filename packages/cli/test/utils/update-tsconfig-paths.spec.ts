/**
 * Regression coverage for the JSONC parser inside `updateTsconfigPaths`.
 *
 * The previous regex-based comment stripper was not string-aware, so the
 * include glob `"src/**​/*.ts"` had its `/​**​/` interpreted as an empty
 * C-style block comment and was rewritten to `"src*.ts"` — silently breaking
 * the user's `tsconfig.build.json` whenever scaffolding ran.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { updateTsconfigPaths } from "../../src/utils/update-tsconfig-paths";

let cwd: string;
let tmp: string;

beforeEach(() => {
	cwd = process.cwd();
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tscfg-"));
	process.chdir(tmp);
});

afterEach(() => {
	process.chdir(cwd);
	fs.rmSync(tmp, { recursive: true, force: true });
});

describe("updateTsconfigPaths — JSONC string-awareness", () => {
	it("does not corrupt `src/**/*.ts` globs inside string values", async () => {
		const original = {
			compilerOptions: { module: "commonjs", target: "ES2021" },
			include: ["src/**/*.ts"],
			exclude: ["node_modules", "dist"],
		};
		fs.writeFileSync(
			"tsconfig.build.json",
			JSON.stringify(original, null, "\t") + "\n",
		);

		await updateTsconfigPaths("useCases", "src");

		const after = JSON.parse(
			fs.readFileSync("tsconfig.build.json", "utf-8"),
		);
		expect(after.include).toEqual(["src/**/*.ts"]);
		expect(after.exclude).toEqual(["node_modules", "dist"]);
		expect(after.compilerOptions.paths).toEqual({
			"@useCases/*": ["./src/useCases/*"],
		});
	});

	it("preserves multiple glob patterns and other star-containing strings", async () => {
		const original = {
			compilerOptions: {
				paths: { "@shared/*": ["./shared/**/*"] },
			},
			include: ["src/**/*.ts", "test/**/*.spec.ts", "**/*.d.ts"],
		};
		fs.writeFileSync(
			"tsconfig.json",
			JSON.stringify(original, null, "\t") + "\n",
		);

		await updateTsconfigPaths("useCases", "src");

		const after = JSON.parse(fs.readFileSync("tsconfig.json", "utf-8"));
		expect(after.include).toEqual([
			"src/**/*.ts",
			"test/**/*.spec.ts",
			"**/*.d.ts",
		]);
		expect(after.compilerOptions.paths["@shared/*"]).toEqual([
			"./shared/**/*",
		]);
		expect(after.compilerOptions.paths["@useCases/*"]).toEqual([
			"./src/useCases/*",
		]);
	});

	it("still strips real // line comments and trailing commas", async () => {
		const jsonc = `{
	// project tsconfig
	"compilerOptions": {
		"module": "commonjs", // module system
		"target": "ES2021",
	},
	"include": ["src/**/*.ts"],
}
`;
		fs.writeFileSync("tsconfig.json", jsonc);

		await updateTsconfigPaths("useCases", "src");

		const after = JSON.parse(fs.readFileSync("tsconfig.json", "utf-8"));
		expect(after.compilerOptions.module).toBe("commonjs");
		expect(after.compilerOptions.target).toBe("ES2021");
		expect(after.compilerOptions.paths["@useCases/*"]).toEqual([
			"./src/useCases/*",
		]);
		expect(after.include).toEqual(["src/**/*.ts"]);
	});

	it("still strips real /* block */ comments outside strings", async () => {
		const jsonc = `{
	/* multi-line
	   comment */
	"compilerOptions": { "module": "commonjs" },
	"include": ["src/**/*.ts"]
}
`;
		fs.writeFileSync("tsconfig.json", jsonc);

		await updateTsconfigPaths("useCases", "src");

		const after = JSON.parse(fs.readFileSync("tsconfig.json", "utf-8"));
		expect(after.include).toEqual(["src/**/*.ts"]);
		expect(after.compilerOptions.paths["@useCases/*"]).toEqual([
			"./src/useCases/*",
		]);
	});
});
