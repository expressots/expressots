import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: ".",
    testMatch: ["<rootDir>/test/**/*.spec.ts"],
    moduleNameMapper: {
        "^@app/(.*)$": "<rootDir>/src/$1",
    },
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/**/*.d.ts",
        "!src/main.ts",
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov"],
};

export default config;

