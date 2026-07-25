import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testRegex: ".*\\.spec\\.ts$",
  testPathIgnorePatterns: ["/node_modules/", "/lib/"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!**/*.spec.ts",
    "!src/**/index.ts",
    "src/path-resolver/index.ts",
    "!src/application/application.types.ts",
    "!src/provider/dto-validator/package-resolver.ts",
    "!**/.docs/**/*.ts",
    "!**/examples/**/*.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 60,
      statements: 60,
      functions: 55,
      branches: 45,
    },
  },
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/src/$1",
    "^express$":
      "<rootDir>/src/middleware/middleware-service.early.spec/__mocks__/express.js",
    "^(\\.{1,2}/.*)\\.js$": "$1",
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
