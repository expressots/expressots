/**
 * write-esm-pkg.js
 *
 * Drops `lib/esm/package.json` containing `{ "type": "module" }` so Node
 * treats every `.js` file under `lib/esm/` (in this package and all its
 * subfolders) as ECMAScript Modules at runtime.
 *
 * Without this, the entry `index.mjs` is ESM (by extension) but its
 * relative imports of `./env/foo.js` and friends would fall back to
 * the package root's package.json, which has no `"type"` field, and Node
 * would treat them as CommonJS - breaking the dual-package build.
 *
 * Run this AFTER `tsc -p tsconfig.esm.json` and AFTER the .mjs rename.
 */
const fs = require("fs");
const path = require("path");

const target = path.join("lib", "esm", "package.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify({ type: "module" }, null, 2) + "\n");
process.stdout.write(`Wrote ${target}\n`);
