import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  testEnvironment: "node",
  roots: ["<rootDir>/packages/core/src"],
  testRegex: ".*\\.spec\\.ts$",
  testPathIgnorePatterns: ["/node_modules/", "/lib/"],
  collectCoverageFrom: ["packages/core/src/**/*.ts", "!**/*.spec.ts", "!packages/core/src/**/index.ts"],
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/packages/core/src/$1",
  },
  setupFiles: ["reflect-metadata"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.base.json",
        // Add any ts-jest specific options here
      },
    ],
  },
};

export default config;
