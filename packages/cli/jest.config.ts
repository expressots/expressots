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
	setupFiles: ["reflect-metadata"],
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.json",
				// Add any ts-jest specific options here
			},
		],
	},
};

export default config;
