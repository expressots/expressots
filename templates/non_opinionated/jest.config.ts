import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    automock: false,
    testMatch: ["**/*.test.ts", "**/*.spec.ts"],
    coverageDirectory: "./coverage",
    coverageReporters: ["text", "html", "json"],
};

export default jestConfig;
