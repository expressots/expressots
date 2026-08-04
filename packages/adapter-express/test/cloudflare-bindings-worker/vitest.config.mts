import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      "iconv-lite": fileURLToPath(new URL("./src/shims/iconv-lite.cjs", import.meta.url)),
    },
  },
  plugins: [
    cloudflareTest({
      miniflare: {
        queueConsumers: {
          "expressots-bindings-jobs": { maxBatchTimeout: 0.05 },
        },
      },
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
});
