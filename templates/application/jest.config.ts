import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: ".",
    testMatch: ["<rootDir>/test/**/*.spec.ts"],
    moduleNameMapper: {
        "^@app/(.*)$": "<rootDir>/src/$1",
        "^@useCases/(.*)$": "<rootDir>/src/useCases/$1",
        "^@providers/(.*)$": "<rootDir>/src/providers/$1",
        "^@entities/(.*)$": "<rootDir>/src/entities/$1",
        "^@middleware/(.*)$": "<rootDir>/src/middleware/$1",
        "^@interceptors/(.*)$": "<rootDir>/src/interceptors/$1",
        "^@events/(.*)$": "<rootDir>/src/events/$1",
        "^@guards/(.*)$": "<rootDir>/src/guards/$1",
        "^@config/(.*)$": "<rootDir>/src/config/$1",
    },
    modulePathIgnorePatterns: ["<rootDir>/dist"],
    collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/main.ts"],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov"],
};

export default config;
