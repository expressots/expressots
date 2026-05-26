#!/usr/bin/env node
/**
 * sync-template-deps — for the templates repo.
 *
 * Reads the root `package.json#version` and rewrites every nested template's
 * `package.json` so all `@expressots/*` deps pin to the matching exact
 * version. The root version is the single source of truth; bump it once and
 * every scaffold tracks it.
 *
 * Run before `git tag v<version>` so the tagged tree carries the consistent
 * dep set that `degit` will hand to a freshly scaffolded project.
 *
 * Usage: node scripts/release/sync-template-deps.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const repoRoot = process.cwd();
const rootPkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const targetVersion = rootPkg.version;

if (typeof targetVersion !== "string" || targetVersion.length === 0) {
    console.error("[sync-template-deps] root package.json#version missing or invalid.");
    process.exit(1);
}

console.log(`[sync-template-deps] aligning all @expressots/* deps to ${targetVersion}`);

// Top-level template dirs that ship through `degit`.
const TEMPLATE_DIRS = ["application", "application-with-events", "micro", "provider"];

let totalEdits = 0;
let filesTouched = 0;

for (const dir of TEMPLATE_DIRS) {
    const pkgPath = resolve(repoRoot, dir, "package.json");
    if (!existsSync(pkgPath)) {
        console.log(`  ${dir}/package.json: not found, skipped`);
        continue;
    }
    const original = readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(original);
    let edits = 0;

    for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
        const block = pkg[section];
        if (!block) continue;
        for (const dep of Object.keys(block)) {
            if (dep.startsWith("@expressots/")) {
                if (block[dep] !== targetVersion) {
                    console.log(`    ${dir}/${section}.${dep}: ${block[dep]} -> ${targetVersion}`);
                    block[dep] = targetVersion;
                    edits++;
                }
            }
        }
    }

    if (edits > 0) {
        const indentMatch = original.match(/^(\s+)"name"/m);
        const indent = indentMatch ? indentMatch[1] : "  ";
        writeFileSync(pkgPath, JSON.stringify(pkg, null, indent) + "\n");
        filesTouched++;
        totalEdits += edits;
    }
}

console.log(`[sync-template-deps] done — ${totalEdits} edit(s) across ${filesTouched} file(s).`);
