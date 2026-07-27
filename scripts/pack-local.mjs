/**
 * pack-local.mjs
 *
 * Packs every public workspace package into .local-packs/ so a local
 * project can install the framework exactly as customers would:
 *
 *   pnpm pack:local
 *   cd ../my-test-app && npm install <monorepo>/.local-packs/*.tgz
 *
 * Installing all tarballs in one command lets the package manager satisfy
 * internal @expressots/* dependencies (workspace:* is rewritten to the
 * real version by `pnpm pack`) from the sibling tarballs instead of npm.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEST = path.join(ROOT, ".local-packs");

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });

const groups = ["packages", "apps"];
const packed = [];
for (const group of groups) {
  const groupDir = path.join(ROOT, group);
  if (!fs.existsSync(groupDir)) continue;
  for (const entry of fs.readdirSync(groupDir)) {
    const pkgDir = path.join(groupDir, entry);
    const manifest = path.join(pkgDir, "package.json");
    if (!fs.existsSync(manifest)) continue;
    const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
    if (pkg.private) {
      console.log(`  skip ${pkg.name} (private)`);
      continue;
    }
    execSync(`pnpm pack --pack-destination ${JSON.stringify(DEST)}`, {
      cwd: pkgDir,
      stdio: ["ignore", "ignore", "inherit"],
    });
    packed.push(`${pkg.name}@${pkg.version}`);
    console.log(`  packed ${pkg.name}@${pkg.version}`);
  }
}

console.log(`\n${packed.length} tarball(s) in ${DEST}`);
console.log(`\nInstall in a test project with:`);
console.log(`  npm install ${DEST}/*.tgz`);
console.log(
  `\nScaffold with the packed CLI (local templates, no GitHub tag needed):`,
);
const cliTgz = fs.readdirSync(DEST).find((f) => f.startsWith("expressots-cli-"));
if (cliTgz) {
  console.log(
    `  EXPRESSOTS_TEMPLATE_REF=main npx --yes ${path.join(DEST, cliTgz)} new my-test-app`,
  );
}
