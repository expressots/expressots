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
    "!src/di/**",
    "!src/adapter-express/express-utils/**",
    "!src/adapter-express/render/resolve-render.ts",
    "!src/adapter-express/micro-api/application-express-micro.ts",
  ],
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/src/$1",
  },
  setupFiles: ["reflect-metadata"],
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
