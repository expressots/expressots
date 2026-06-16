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
    "!src/adapter-express/render/resolve-render.ts",
    "!src/adapter-express/micro-api/application-express-micro.ts",
    // Preview / optional v4 modules — tracked separately; excluded from
    // coverage gates until they have dedicated test suites.
    "!src/adapter-express/micro-api/gateway/**",
    "!src/adapter-express/micro-api/queue/**",
    "!src/adapter-express/micro-api/service-mesh/**",
    "!src/adapter-express/micro-api/serverless/**",
    "!src/adapter-express/micro-api/application-express-micro-container.ts",
    "!src/adapter-express/micro-api/application-express-micro-route.ts",
    "!src/adapter-express/middleware/**",
    "!src/adapter-express/express-utils/setup-lazy-loading.ts",
    "!src/adapter-express/express-utils/lazy-module-middleware.ts",
  ],
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
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
