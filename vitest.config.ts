import { defineConfig } from "vitest/config";
import { codecovVitePlugin } from "@codecov/vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * @see {@link https://vitejs.dev/config/}
 * @see {@link https://vitest.dev/config/}
 */
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    codecovVitePlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      bundleName: "expresso-ts-core-coverage",
      uploadToken: process.env.CODECOV_TOKEN,
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["reflect-metadata"],
    exclude: [
      "**/node_modules/**",
      "**/test/**",
      "**/benchmark/**",
      "templates/**",
      "**/lib/**",
    ],
    coverage: {
      all: true,
      include: ["**/core/**"],
      exclude: [
        "**/node_modules/**",
        "**/lib/**",
        "**/test/**",
        "**/__tests__/**",
        "**/benchmark/**",
        "**/index.ts/**",
        "templates/**",
      ],
      thresholds: {
        global: {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },
      reporter: ["text", "html", "json"],
      provider: "v8",
    },
    // ref: https://vitest.dev/config/#testtimeout
    testTimeout: 10000,
  },
});
