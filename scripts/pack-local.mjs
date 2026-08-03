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
 *
 * Or point an existing project at the freshly packed build in one step:
 *
 *   pnpm pack:local --link ../my-test-app
 *
 * `--link` rewrites that project's @expressots/* dependencies to the local
 * tarballs, pins the transitive ones so a published copy cannot sneak back
 * in, and reinstalls with whichever package manager the project uses.
 */
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEST = path.join(ROOT, ".local-packs");

const args = process.argv.slice(2);
const linkIndex = args.findIndex((a) => a === "--link" || a.startsWith("--link="));
let linkTarget = null;
if (linkIndex !== -1) {
  const arg = args[linkIndex];
  linkTarget = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : args[linkIndex + 1];
  if (!linkTarget) {
    console.error("  --link needs a project directory: pack:local --link ../my-app");
    process.exit(1);
  }
  linkTarget = path.resolve(process.cwd(), linkTarget);
}

const SUPPORTED_PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"];
const pmIndex = args.findIndex((a) => a === "--pm" || a.startsWith("--pm="));
let forcedPackageManager = null;
if (pmIndex !== -1) {
  const arg = args[pmIndex];
  forcedPackageManager = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : args[pmIndex + 1];
  if (!SUPPORTED_PACKAGE_MANAGERS.includes(forcedPackageManager)) {
    console.error(`  --pm must be one of: ${SUPPORTED_PACKAGE_MANAGERS.join(", ")}`);
    process.exit(1);
  }
}

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

if (linkTarget) {
  linkProject(linkTarget);
} else {
  console.log(`\nInstall in a test project with:`);
  console.log(`  npm install ${DEST}/*.tgz`);
  console.log(`\nOr point an existing project at this build:`);
  console.log(`  pnpm pack:local --link ../my-test-app`);
  console.log(
    `\nScaffold with the packed CLI (local templates, no GitHub tag needed):`,
  );
  const cliTgz = fs.readdirSync(DEST).find((f) => f.startsWith("expressots-cli-"));
  if (cliTgz) {
    console.log(
      `  EXPRESSOTS_TEMPLATE_REF=main npx --yes ${path.join(DEST, cliTgz)} new my-test-app`,
    );
  }
}

/**
 * Map @expressots/* package name -> tarball path, with a content hash in the
 * filename.
 *
 * The hash is not cosmetic. Package managers cache `file:` specifiers by
 * path, so reinstalling after a rebuild silently reuses the previous tarball
 * and you test stale code — which looks exactly like "the fix doesn't work".
 * A content-addressed name makes a changed build a different specifier, and
 * an unchanged one still hit the cache.
 */
function buildTarballMap() {
  const map = new Map();

  for (const file of fs.readdirSync(DEST)) {
    if (!file.endsWith(".tgz") || file.includes("-linked-")) continue;

    const source = path.join(DEST, file);
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(source))
      .digest("hex")
      .slice(0, 8);

    // expressots-adapter-express-4.1.1.tgz -> @expressots/adapter-express
    const withoutExt = file.slice(0, -".tgz".length);
    const name = withoutExt.replace(/^expressots-/, "").replace(/-\d[\d.]*.*$/, "");
    const packageName = name === "expressots" ? "expressots" : `@expressots/${name}`;

    const linkedName = `${withoutExt}-linked-${hash}.tgz`;
    const linkedPath = path.join(DEST, linkedName);
    if (!fs.existsSync(linkedPath)) {
      fs.copyFileSync(source, linkedPath);
    }

    map.set(packageName, `file:${linkedPath}`);
  }

  return map;
}

function detectPackageManager(dir, pkg) {
  if (forcedPackageManager) return forcedPackageManager;

  // A `packageManager` field is authoritative when present (corepack).
  const declared = pkg?.packageManager;
  if (typeof declared === "string") {
    const name = declared.split("@")[0];
    if (SUPPORTED_PACKAGE_MANAGERS.includes(name)) return name;
  }

  if (fs.existsSync(path.join(dir, "bun.lock")) || fs.existsSync(path.join(dir, "bun.lockb")))
    return "bun";
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(dir, "package-lock.json"))) return "npm";

  // A freshly scaffolded project (EXPRESSOTS_SKIP_INSTALL) has no lockfile
  // and records no package manager, so there is nothing to detect from.
  // pnpm at least leaves a workspace file behind; otherwise fall back to npm
  // and say so, since installing with the wrong one leaves a stray lockfile.
  if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return "pnpm";

  console.log(
    `\n  No lockfile or packageManager field in the target — assuming npm.` +
      `\n  Pass --pm bun|pnpm|yarn|npm to choose explicitly.`,
  );
  return "npm";
}

function linkProject(dir) {
  const manifestPath = path.join(dir, "package.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`\n  --link: no package.json in ${dir}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(manifestPath, "utf8");
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch (error) {
    console.error(`\n  --link: ${manifestPath} is not valid JSON (${error.message})`);
    process.exit(1);
  }

  const tarballs = buildTarballMap();
  const packageManager = detectPackageManager(dir, pkg);
  const linked = [];

  // Rewrite only what the project already depends on. Adding packages it
  // never asked for (studio, boost-ts) would change what is under test.
  for (const section of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(pkg[section] ?? {})) {
      const tarball = tarballs.get(name);
      if (tarball) {
        pkg[section][name] = tarball;
        linked.push(name);
      }
    }
  }

  if (linked.length === 0) {
    console.error(`\n  --link: ${dir} has no @expressots/* dependencies to link`);
    process.exit(1);
  }

  // Direct dependencies alone are not enough: @expressots/adapter-express
  // depends on @expressots/core by version, so the published copy gets
  // installed alongside the local one and the bundler picks the wrong file.
  // Every package manager spells this differently.
  const overrides = {};
  for (const name of linked) {
    overrides[name] = tarballs.get(name);
  }
  // Also pin framework packages the project does not list directly but that
  // its dependencies will pull in transitively.
  for (const [name, tarball] of tarballs) {
    if (name.startsWith("@expressots/") && !overrides[name]) {
      overrides[name] = tarball;
    }
  }

  if (packageManager === "pnpm") {
    // pnpm 10+ ignores the `pnpm` field in package.json; overrides live in
    // pnpm-workspace.yaml.
    writePnpmOverrides(dir, overrides);
    delete pkg.overrides;
    delete pkg.resolutions;
  } else if (packageManager === "bun" || packageManager === "yarn") {
    pkg.resolutions = { ...pkg.resolutions, ...overrides };
  } else {
    pkg.overrides = { ...pkg.overrides, ...overrides };
  }

  const indent = raw.match(/^[ \t]+/m)?.[0] ?? "  ";
  fs.writeFileSync(manifestPath, `${JSON.stringify(pkg, null, indent)}\n`);

  console.log(`\nLinked ${linked.length} package(s) into ${dir}:`);
  for (const name of linked) console.log(`  ${name}`);
  console.log(`\nInstalling with ${packageManager}...`);

  try {
    execSync(`${packageManager} install`, { cwd: dir, stdio: "inherit" });
  } catch {
    console.error(`\n  ${packageManager} install failed. Fix the errors above and rerun.`);
    process.exit(1);
  }

  console.log(`\nDone. ${dir} now uses this build of the framework.`);
  console.log(`Re-run pack:local --link after any change to the monorepo.`);
}

function writePnpmOverrides(dir, overrides) {
  const workspacePath = path.join(dir, "pnpm-workspace.yaml");
  const existing = fs.existsSync(workspacePath) ? fs.readFileSync(workspacePath, "utf8") : "";

  // Replace a previous block rather than appending a second `overrides:` key,
  // which would make the YAML invalid.
  const withoutOverrides = existing.replace(/^overrides:\n(?:[ \t]+.*\n?)*/m, "");
  const block = [
    "overrides:",
    ...Object.entries(overrides).map(([name, spec]) => `  "${name}": "${spec}"`),
    "",
  ].join("\n");

  const separator = withoutOverrides.length === 0 || withoutOverrides.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(workspacePath, `${withoutOverrides}${separator}${block}`);
}
