/**
 * write-esm-pkg.js
 *
 * Drops `lib/esm/package.json` containing `{ "type": "module" }` so Node
 * treats every `.js` file under `lib/esm/` as ECMAScript Modules at
 * runtime. See sibling repos for the same helper.
 */
const fs = require("fs");
const path = require("path");

const target = path.join("lib", "esm", "package.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify({ type: "module" }, null, 2) + "\n");
process.stdout.write(`Wrote ${target}\n`);
