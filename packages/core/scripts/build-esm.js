/**
 * build-esm.js
 *
 * Atomic ESM build for a package whose source `package.json` is
 * intentionally CJS-default (no `"type": "module"`).
 *
 * Why this dance is needed:
 *   - We want `module: NodeNext` + `moduleResolution: NodeNext` in the
 *     ESM tsconfig so TypeScript validates the `.js` extension on every
 *     relative import.
 *   - With `module: NodeNext`, TypeScript decides whether to emit CJS or
 *     ESM by reading the SOURCE file's nearest `package.json` `"type"`
 *     field. With no `"type": "module"`, it emits CJS.
 *   - We can't permanently set `"type": "module"` in the source
 *     `package.json` because that breaks the CJS build's Node resolution
 *     for consumers of `lib/cjs/*.js`.
 *
 * So we:
 *   1. Read and remember the current `package.json`.
 *   2. Write a copy with `"type": "module"` added.
 *   3. Run `tsc -p tsconfig.esm.json` (TS now emits real ESM).
 *   4. Always restore the original `package.json`, even on failure.
 *   5. Rename the entry to `.mjs` and drop `lib/esm/package.json` with
 *      `{"type":"module"}` so Node treats every .js file under lib/esm
 *      as ESM at runtime, regardless of the source `package.json`.
 *
 * The window where `package.json` on disk has `"type": "module"` is the
 * tsc compile time only - a few seconds. During that window, `npm`
 * commands that read `package.json` for type would see `"module"`; we do
 * not run any such commands inside the window.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PKG_PATH = "package.json";
const TSCONFIG = "tsconfig.esm.json";
const ESM_DIR = path.join("lib", "esm");
const INDEX_JS = path.join(ESM_DIR, "index.js");
const INDEX_MJS = path.join(ESM_DIR, "index.mjs");
const ESM_PKG = path.join(ESM_DIR, "package.json");

function run(cmd) {
  process.stdout.write(`[build-esm] $ ${cmd}\n`);
  execSync(cmd, { stdio: "inherit" });
}

const originalRaw = fs.readFileSync(PKG_PATH, "utf8");
const originalJson = JSON.parse(originalRaw);
const wasAlreadyModule = originalJson.type === "module";

if (!wasAlreadyModule) {
  const swapped = { ...originalJson, type: "module" };
  fs.writeFileSync(PKG_PATH, JSON.stringify(swapped, null, 2) + "\n");
  process.stdout.write(
    `[build-esm] Temporarily set ${PKG_PATH} "type": "module" for ESM compile.\n`,
  );
}

try {
  run(`tsc -p ${TSCONFIG}`);

  if (fs.existsSync(INDEX_JS)) {
    fs.renameSync(INDEX_JS, INDEX_MJS);
    process.stdout.write(`[build-esm] Renamed ${INDEX_JS} -> ${INDEX_MJS}\n`);
  } else {
    process.stdout.write(
      `[build-esm] WARN: ${INDEX_JS} not found; skipping rename.\n`,
    );
  }

  fs.mkdirSync(ESM_DIR, { recursive: true });
  fs.writeFileSync(
    ESM_PKG,
    JSON.stringify({ type: "module" }, null, 2) + "\n",
  );
  process.stdout.write(`[build-esm] Wrote ${ESM_PKG}\n`);
} finally {
  if (!wasAlreadyModule) {
    fs.writeFileSync(PKG_PATH, originalRaw);
    process.stdout.write(`[build-esm] Restored ${PKG_PATH}.\n`);
  }
}
