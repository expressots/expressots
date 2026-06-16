import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: ".",
    testMatch: ["<rootDir>/test/**/*.spec.ts"],
    forceExit: true,
};

export default config;
