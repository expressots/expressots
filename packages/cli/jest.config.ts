import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
	testEnvironment: "node",
	roots: ["<rootDir>/src", "<rootDir>/test"],
	testRegex: ".*\\.spec\\.ts$",
	testPathIgnorePatterns: ["/node_modules/", "/bin/"],
	collectCoverageFrom: [
		"src/**/*.ts",
		"!**/*.spec.ts",
		"!src/**/index.ts",
		"src/costs/providers/index.ts",
		"!src/**/*.tpl",
		"!src/**/form.ts",
		"!src/**/cli.ts",
		"!src/migrate/**",
		"!src/profile/**",
		"!src/studio/**",
		"!src/openapi/**",
		"!src/info/**",
		"!src/scripts/**",
		"!src/providers/create/**",
		"!src/templates/cli.ts",
		"!src/templates/fetcher.ts",
		"!src/templates/manager.ts",
		"!src/costs/types.ts",
		"!src/containerize/generators/ci-generator.ts",
	],
	moduleNameMapper: {
		"^@src/(.*)$": "<rootDir>/src/$1",
	},
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.json",
				// ts-jest warns (TS151002) that Node16 module resolution
				// prefers isolatedModules: true, but enabling it triggers a
				// ts-jest transpiler bug on TypeScript 5.2 (JSDocParsingMode
				// is 5.3+). Suppress the advisory until the TS toolchain
				// upgrade lands.
				diagnostics: { ignoreCodes: [151002] },
			},
		],
	},
};

export default config;
