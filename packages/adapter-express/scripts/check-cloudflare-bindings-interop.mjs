import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cjs = require("../lib/cjs/index.js");
const esm = await import(new URL("../lib/esm/index.mjs", import.meta.url).href);

const kv = {
  async getWithMetadata() {
    return { value: "dark" };
  },
};

const esmBindings = esm.cloudflareBindings();
const cjsBindings = cjs.cloudflareBindings();
const tokenFromEsm = esmBindings.kv("SETTINGS");
const tokenFromCjs = cjsBindings.kv("SETTINGS");
const servicesFactory = Symbol.for(
  "@expressots/adapter-express/cloudflare-services-factory",
);
const servicesFromCjs = cjsBindings[servicesFactory]({ SETTINGS: kv });

assert.equal(servicesFromCjs.get(tokenFromEsm), kv);
assert.notEqual(tokenFromEsm.serviceIdentifier, tokenFromCjs.serviceIdentifier);
assert.equal(
  tokenFromEsm[
    Symbol.for("@expressots/adapter-express/cloudflare-binding-token")
  ],
  true,
);

process.stdout.write("Cloudflare binding CJS/ESM interoperability: OK\n");
