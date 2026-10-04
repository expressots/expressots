import type { Config } from "jest";
const config: Config = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.spec.ts"],
  testTimeout: 30000,
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          ...require("./tsconfig.json").compilerOptions,
          rootDir: ".",
          module: "ES2022",
          moduleResolution: "node",
          target: "ES2022",
        },
      },
    ],
  },
};
export default config;
