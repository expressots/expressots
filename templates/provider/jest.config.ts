import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  rootDir: "./",
  verbose: true,
  automock: false,
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  coverageDirectory: "./coverage",
  coverageReporters: ["text", "html", "json"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/lib/"],
  collectCoverageFrom: ["src/**/*.ts", "!**/*.spec.ts", "src/**/index.ts"],
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/src/$1",
  },
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
