"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jestConfig = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    automock: false,
    testMatch: ["**/*.test.ts", "**/*.spec.ts"],
    coverageDirectory: "../coverage",
    coverageReporters: ["text", "html", "json"]
};
exports.default = jestConfig;
//# sourceMappingURL=jest.config.js.map