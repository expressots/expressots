import { defineConfig } from "vitest/config";

/**
 * @see {@link https://vitejs.dev/config/}
 * @see {@link https://vitest.dev/config/}
 */
export default defineConfig({
  test: {
    globals: true,
    coverage: {
      all: true,
      include: ["**/core/**"],
      exclude: [
        "**/node_modules/**",
        "**/test/**",
        "**/benchmark/**",
        "**/index.ts/**",
      ],
      reporter: ["text", "html", "lcov", "json", "clover"],
    },
    // ref: https://vitest.dev/config/#testtimeout
    testTimeout: 10000,
  },
});
