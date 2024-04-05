import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * @see {@link https://vitejs.dev/config/}
 * @see {@link https://vitest.dev/config/}
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
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
