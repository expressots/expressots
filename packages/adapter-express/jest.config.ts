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
    "!src/adapter-express/micro-api/**",
    "!src/adapter-express/middleware/**",
    "!src/adapter-express/express-utils/setup-*.ts",
    "!src/adapter-express/express-utils/lazy-module-middleware.ts",
    "!src/adapter-express/express-utils/scope-extractor.ts",
    "!src/adapter-express/express-utils/permission-preloader.middleware.ts",
    "!src/adapter-express/express-utils/guard-*.ts",
    "!src/adapter-express/express-utils/interceptor-middleware.ts",
    "!src/adapter-express/express-utils/exception-filter-decorators.ts",
    "!src/adapter-express/express-utils/route-constraints.ts",
    "!src/adapter-express/express-utils/httpResponseMessage.ts",
    "!src/adapter-express/express-utils/content-negotiation-decorators.ts",
    "!src/adapter-express/express-utils/resolver-multer.ts",
    "!src/adapter-express/express-utils/http-context-store.ts",
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
