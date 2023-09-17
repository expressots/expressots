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
		},
		// ref: https://vitest.dev/config/#testtimeout
		testTimeout: 10000,
	},
});
