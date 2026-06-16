#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PKG = path.join(ROOT, "package.json");
const TARGET = path.join(ROOT, "packages", "core", "src", "framework-version.ts");

const pkg = JSON.parse(fs.readFileSync(PKG, "utf8"));
const version = pkg.version;

if (!version || typeof version !== "string") {
  console.error("[sync-version] No valid version found in package.json");
  process.exit(1);
}

const contents = `/**
 * Framework version string surfaced in startup banners and diagnostics.
 *
 * This file is auto-synced from the root \`package.json\` by
 * \`scripts/sync-version.js\` before each build. Do not edit by hand.
 */
export const FRAMEWORK_VERSION = "${version}";
`;

const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, "utf8") : "";
if (current === contents) {
  console.log(`[sync-version] framework-version.ts already at ${version}`);
} else {
  fs.writeFileSync(TARGET, contents);
  console.log(`[sync-version] framework-version.ts -> ${version}`);
}
