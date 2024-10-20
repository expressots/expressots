import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        testEnvironment: "node",
        tsconfig: "tsconfig.json",
        roots: ["<rootDir>/src"],
        testRegex: ".*\\.spec\\.ts$",
        testPathIgnorePatterns: ["/node_modules/", "/lib/"],
        collectCoverageFrom: ["src/**/*.ts", "!**/*.spec.ts", "!src/**/index.ts"],
        moduleNameMapper: {
          "^@src/(.*)$": "<rootDir>/src/$1",
        },
        setupFiles: ["reflect-metadata"],
      },
    ],
  },
};

export default config;
