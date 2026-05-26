#!/usr/bin/env node
/**
 * release:restore — restore package.json from the backup created by
 * `release:prepare`. Idempotent: if no backup exists, this is a no-op.
 *
 * Run after `npm publish` so the source tree returns to its dev-friendly
 * state (file: deps preserved for local workspace development).
 */

import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const pkgPath = resolve(process.cwd(), "package.json");
const backupPath = `${pkgPath}.bak`;

if (!existsSync(backupPath)) {
    console.log("[release:restore] no package.json.bak found; nothing to restore.");
    process.exit(0);
}

copyFileSync(backupPath, pkgPath);
unlinkSync(backupPath);
console.log("[release:restore] package.json restored from backup.");
