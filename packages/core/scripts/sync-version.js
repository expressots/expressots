#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PKG = path.join(ROOT, "package.json");
const TARGET = path.join(ROOT, "src", "framework-version.ts");

const pkg = JSON.parse(fs.readFileSync(PKG, "utf8"));
const version = pkg.version;

if (!version || typeof version !== "string") {
  console.error("[sync-version] No valid version found in package.json");
  process.exit(1);
}

const contents = `/**
 * Framework version string surfaced in startup banners and diagnostics.
 *
 * Auto-synced from this package's \`package.json\` by
 * \`packages/core/scripts/sync-version.js\`, which runs before each build and
 * again during the release version bump. Do not edit by hand.
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
