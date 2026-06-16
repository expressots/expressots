import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    automock: false,
    testMatch: ["**/*.test.ts", "**/*.spec.ts"],
    coverageDirectory: "./coverage",
    coverageReporters: ["text", "html", "json"],
    moduleNameMapper: {
        "^@entities/(.*)$": "<rootDir>/src/entities/$1",
        "^@providers/(.*)$": "<rootDir>/src/providers/$1",
        "^@repositories/(.*)$": "<rootDir>/src/repositories/$1",
        "^@useCases/(.*)$": "<rootDir>/src/useCases/$1",
    },
};

export default jestConfig;
