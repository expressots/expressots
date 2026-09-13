import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      // The pool does not read wrangler.toml's `alias`, so the iconv-lite
      // stub is repeated here; otherwise the suite would test a bundle that
      // differs from the deployed one.
      "iconv-lite": fileURLToPath(new URL("./src/shims/iconv-lite.cjs", import.meta.url)),
      // Not installed in Worker projects; see the shim for why the alias is
      // needed inside the monorepo.
      "@expressots/studio-agent": fileURLToPath(
        new URL("./src/shims/studio-agent-absent.mjs", import.meta.url),
      ),
    },
  },
  plugins: [
    cloudflareTest({
      miniflare: {
        // Deliver queued messages promptly so the Queue test does not wait
        // for the production batch timeout.
        queueConsumers: {
          "expressots-bindings-jobs": { maxBatchTimeout: 0.05 },
        },
      },
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
});
