#!/usr/bin/env node
/**
 * release:prepare — rewrite package.json for `npm publish`.
 *
 * - Backs up package.json to package.json.bak (refuses to run if a stale
 *   backup already exists; you must run `release:restore` first).
 * - Replaces every `"@expressots/<name>": "file:..."` dependency with a
 *   caret range derived from this package's own `version` field.
 *
 * The `version` field of this package.json is the single source of truth
 * for the @expressots/* dep range (e.g. version `4.0.0-preview.3` produces
 * the range `^4.0.0-preview.3`). Bump once, propagate everywhere.
 *
 * Companion: scripts/release/restore-package-json.mjs (npm `release:restore`).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const pkgPath = resolve(process.cwd(), "package.json");
const backupPath = `${pkgPath}.bak`;

if (existsSync(backupPath)) {
    console.error(
        "[release:prepare] package.json.bak already exists. Run `npm run release:restore` before retrying.",
    );
    process.exit(1);
}

const original = readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(original);
const version = pkg.version;

if (typeof version !== "string" || version.length === 0) {
    console.error("[release:prepare] package.json#version is missing or invalid.");
    process.exit(1);
}

const range = `^${version}`;
console.log(`[release:prepare] ${pkg.name}@${version} -> rewriting @expressots/* file: deps to ${range}`);

// Rewrite `@expressots/*` deps that are either local `file:` refs
// or plain version pins (no operator). Leave peerDependencies alone —
// those use deliberate ranges (e.g. `>=4.0.0-0`).
const PLAIN_VERSION_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/;
let rewritten = 0;
for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const block = pkg[section];
    if (!block) continue;
    for (const [dep, value] of Object.entries(block)) {
        if (!dep.startsWith("@expressots/") || typeof value !== "string") continue;
        const isFile = value.startsWith("file:");
        const isPlain = PLAIN_VERSION_RE.test(value);
        if (!isFile && !isPlain) continue;
        block[dep] = range;
        rewritten++;
        console.log(`  ${section}.${dep}: ${value} -> ${range}`);
    }
}

const indentMatch = original.match(/^(\s+)"name"/m);
const indent = indentMatch ? indentMatch[1] : "  ";
writeFileSync(backupPath, original);
writeFileSync(pkgPath, JSON.stringify(pkg, null, indent) + "\n");

console.log(`[release:prepare] ${rewritten} dep(s) rewritten; backup at ${backupPath}.`);
