#!/usr/bin/env node
/**
 * prepublishOnly guard: abort `npm publish` if any dependency still uses a
 * local `file:` reference. This prevents accidentally shipping broken
 * packages to the npm registry.
 *
 * Runs automatically via the "prepublishOnly" npm lifecycle hook.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkgPath = resolve(process.cwd(), "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const problems = [];
for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const block = pkg[section];
    if (!block) continue;
    for (const [dep, value] of Object.entries(block)) {
        if (typeof value === "string" && value.startsWith("file:")) {
            problems.push(`  ${section}.${dep}: ${value}`);
        }
    }
}

if (problems.length > 0) {
    console.error("\n[guard] PUBLISH BLOCKED: package.json contains file: dependencies.\n");
    console.error(problems.join("\n"));
    console.error("\nRun `npm run release:publish` instead of `npm publish` directly.");
    console.error("This ensures file: refs are rewritten to registry ranges before publishing.\n");
    process.exit(1);
}

console.log("[guard] No file: dependencies found. Proceeding with publish.");
