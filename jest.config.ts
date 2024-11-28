import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  testEnvironment: "node",
  roots: ["<rootDir>/packages/core/src"],
  testRegex: ".*\\.spec\\.ts$",
  testPathIgnorePatterns: ["/node_modules/", "/lib/"],
  collectCoverageFrom: [
    "packages/core/src/**/*.ts",
    "!**/*.spec.ts",
    "!packages/core/src/**/index.ts",
    "!packages/core/src/di/**/*.ts",
    "!packages/core/src/middleware/**/*.ts",
    "!packages/core/src/application/application.types.ts",
    "!packages/core/src/provider/dto-validator/package-resolver.ts",
  ],
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/packages/core/src/$1",
    "^express$":
      "<rootDir>/packages/core/src/middleware/middleware-service.early.spec/__mocks__/express.js",
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
