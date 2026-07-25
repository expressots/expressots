#!/usr/bin/env node
/**
 * ExpressoTS release pipeline.
 *
 *   pnpm release                 full flow: report -> version -> publish
 *   pnpm release:report          production-readiness report only
 *   flags: --report-only --skip-smoke --skip-templates --yes
 *
 * Stages:
 *   1. Preflight     git/tooling sanity
 *   2. Verify        build + lint + test (turbo, dependency order)
 *   3. Pack checks   publint + arethetypeswrong on every publishable package
 *   4. Smoke test    install packed tarballs into the starter example, boot it,
 *                    hit /api/health — tests what users actually download
 *   5. Version       conventional-commit scan -> suggested bump -> changeset;
 *                    also re-pins @expressots/* in templates/ and examples/
 *   6. Publish       changeset publish (topological order) + tags
 *   7. Templates     sync templates/ -> expressots/templates and tag vX.Y.Z
 *                    (the CLI scaffolds via degit expressots/templates#v<cli version>,
 *                    so a published CLI is broken until its matching tag exists)
 */
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const REPORT_ONLY = args.includes("--report-only");
const SKIP_SMOKE = args.includes("--skip-smoke");
const SKIP_TEMPLATES = args.includes("--skip-templates");
const YES = args.includes("--yes");

const TEMPLATES_REPO = "git@github.com:expressots/templates.git";

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

/** @type {{stage: string, name: string, status: "pass"|"fail"|"warn"|"skip", detail?: string, seconds?: number}[]} */
const results = [];
function record(stage, name, status, detail = "", seconds) {
  results.push({ stage, name, status, detail, seconds });
  const icon = { pass: c.green("✔"), fail: c.red("✘"), warn: c.yellow("⚠"), skip: c.dim("–") }[status];
  const time = seconds !== undefined ? c.dim(` (${seconds.toFixed(1)}s)`) : "";
  console.log(`  ${icon} ${name}${time}${detail ? c.dim(` — ${detail}`) : ""}`);
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
}

/** Run a command as a timed check. Returns true on success. */
function check(stage, name, cmd, { cwd = ROOT, failStatus = "fail" } = {}) {
  const start = Date.now();
  try {
    execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    record(stage, name, "pass", "", (Date.now() - start) / 1000);
    return true;
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim().split("\n").slice(-15).join("\n");
    record(stage, name, failStatus, out.split("\n")[0] ?? "", (Date.now() - start) / 1000);
    if (out) console.log(c.dim(out.replace(/^/gm, "      ")));
    return false;
  }
}

function header(title) {
  console.log(`\n${c.bold(c.cyan(`━━ ${title} `.padEnd(60, "━")))}`);
}

function workspacePackages() {
  const dirs = ["packages", "apps"]
    .flatMap((d) => fs.readdirSync(path.join(ROOT, d)).map((n) => path.join(d, n)))
    .filter((p) => fs.existsSync(path.join(ROOT, p, "package.json")));
  return dirs.map((dir) => ({ dir, pkg: JSON.parse(fs.readFileSync(path.join(ROOT, dir, "package.json"), "utf8")) }));
}

// ---------------------------------------------------------------- stage 1
function preflight() {
  header("Stage 1 · Preflight");
  let ok = true;

  const dirty = sh("git status --porcelain");
  if (dirty) { record("preflight", "clean working tree", "fail", `${dirty.split("\n").length} uncommitted file(s)`); ok = false; }
  else record("preflight", "clean working tree", "pass");

  const branch = sh("git branch --show-current");
  if (branch !== "main") record("preflight", `on main branch`, "warn", `currently on '${branch}'`);
  else record("preflight", "on main branch", "pass");

  try {
    sh("git rev-parse --abbrev-ref @{upstream}");
    const behind = sh("git rev-list --count HEAD..@{upstream}");
    if (behind !== "0") { record("preflight", "up to date with upstream", "fail", `${behind} commit(s) behind`); ok = false; }
    else record("preflight", "up to date with upstream", "pass");
  } catch {
    record("preflight", "up to date with upstream", "warn", "no upstream configured (not pushed yet)");
  }

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < 20) { record("preflight", "node >= 20", "fail", `node ${process.versions.node}`); ok = false; }
  else record("preflight", "node >= 20", "pass", `node ${process.versions.node}`);

  // Warn-only here so the version stage can be rehearsed while logged out;
  // publishStage() re-checks and hard-fails before anything leaves the machine.
  try { record("preflight", "npm authenticated", "pass", sh("npm whoami")); }
  catch { record("preflight", "npm authenticated", "warn", "run `npm login` before publishing"); }

  try {
    sh(`git ls-remote --heads ${TEMPLATES_REPO} main`);
    record("preflight", "templates repo reachable", "pass");
  } catch {
    const needed = !REPORT_ONLY && !SKIP_TEMPLATES;
    record("preflight", "templates repo reachable", needed ? "fail" : "warn", `cannot reach ${TEMPLATES_REPO}`);
    if (needed) ok = false;
  }

  return ok;
}

// ---------------------------------------------------------------- stage 2
function verify() {
  header("Stage 2 · Build, lint, test");
  let ok = true;
  ok = check("verify", "turbo build (all packages, dependency order)", "pnpm build") && ok;
  ok = check("verify", "turbo lint", "pnpm lint") && ok;
  ok = check("verify", "turbo test", "pnpm test") && ok;
  return ok;
}

// ---------------------------------------------------------------- stage 3
function packChecks(packDir) {
  header("Stage 3 · Package correctness (publint + arethetypeswrong)");
  let ok = true;
  const publishable = workspacePackages().filter(({ pkg }) => !pkg.private);

  fs.mkdirSync(packDir, { recursive: true });
  const tarballs = {};
  for (const { dir, pkg } of publishable) {
    const start = Date.now();
    try {
      const out = sh(`pnpm pack --pack-destination ${JSON.stringify(packDir)}`, { cwd: path.join(ROOT, dir) });
      const tgz = out.split("\n").pop().trim();
      tarballs[pkg.name] = tgz;
      record("pack", `pack ${pkg.name}`, "pass", path.basename(tgz), (Date.now() - start) / 1000);
    } catch (err) {
      record("pack", `pack ${pkg.name}`, "fail", String(err.message).split("\n")[0], (Date.now() - start) / 1000);
      ok = false;
    }
  }

  for (const { dir, pkg } of publishable) {
    ok = check("pack", `publint ${pkg.name}`, `pnpm exec publint ${JSON.stringify(path.join(ROOT, dir))}`) && ok;
    if (!tarballs[pkg.name]) continue;

    // Bin-only packages (no main/exports/types) have no importable surface;
    // attw has nothing to analyze and crashes on them.
    if (!pkg.main && !pkg.exports && !pkg.types) {
      record("pack", `attw ${pkg.name}`, "pass", "bin-only package — no importable entry points, attw n/a");
      continue;
    }

    // ESM-only packages intentionally ship no CJS build (engines require
    // Node >= 20.19, where require(esm) works natively). Tell attw the
    // supported profile instead of warning about resolutions we don't claim.
    const esmOnly = pkg.type === "module" && !JSON.stringify(pkg.exports ?? {}).includes('"require"');
    const profile = esmOnly ? " --profile esm-only" : "";
    // attw is advisory: strict resolution nits should be visible, not blocking
    check("pack", `attw ${pkg.name}`, `pnpm exec attw ${JSON.stringify(tarballs[pkg.name])} --format table-flipped${profile}`, { failStatus: "warn" });
  }
  return { ok, tarballs };
}

// ---------------------------------------------------------------- stage 4
async function smokeTest(tarballs) {
  header("Stage 4 · Smoke test (starter example against packed tarballs)");
  if (SKIP_SMOKE) { record("smoke", "starter example boot", "skip", "--skip-smoke"); return true; }

  const start = Date.now();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-smoke-"));
  const app = path.join(tmp, "starter-api");
  fs.cpSync(path.join(ROOT, "examples/01-starter-api"), app, {
    recursive: true,
    filter: (src) => !src.includes("node_modules") && !src.includes(`${path.sep}dist`),
  });

  // point every @expressots/* dependency at the freshly packed tarballs
  const pkgPath = path.join(app, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  for (const section of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(pkg[section] ?? {})) {
      if (tarballs[name]) pkg[section][name] = `file:${tarballs[name]}`;
    }
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  try {
    execSync("npm install --no-audit --no-fund --loglevel=error", { cwd: app, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
    record("smoke", "npm install from tarballs", "pass", "", (Date.now() - start) / 1000);
  } catch (err) {
    record("smoke", "npm install from tarballs", "fail", `${err.stderr ?? err.message}`.split("\n")[0]);
    return false;
  }

  if (!check("smoke", "expressots build (via packed CLI)", "npm run build", { cwd: app })) return false;

  const PORT = 3123;
  const server = spawn("node", ["dist/src/main.js"], { cwd: app, env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let bootLog = "";
  server.stdout.on("data", (d) => (bootLog += d));
  server.stderr.on("data", (d) => (bootLog += d));

  let healthy = false;
  let body = "";
  for (let i = 0; i < 40 && !healthy; i++) {
    await new Promise((r) => setTimeout(r, 500));
    for (const route of ["/api/health", "/health", "/api/"]) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}${route}`);
        if (res.ok) { healthy = true; body = `${route} -> ${res.status}`; break; }
      } catch { /* not up yet */ }
    }
    if (server.exitCode !== null) break;
  }
  try { process.kill(-server.pid, "SIGTERM"); } catch { /* already gone */ }

  if (healthy) record("smoke", "server boots and responds", "pass", body, (Date.now() - start) / 1000);
  else {
    record("smoke", "server boots and responds", "fail", server.exitCode !== null ? `process exited ${server.exitCode}` : "no HTTP response in 20s");
    console.log(c.dim(bootLog.split("\n").slice(-10).join("\n").replace(/^/gm, "      ")));
  }
  return healthy;
}

// ---------------------------------------------------------------- report
function writeReport(currentVersion) {
  const failed = results.filter((r) => r.status === "fail");
  const warned = results.filter((r) => r.status === "warn");
  const ready = failed.length === 0;

  const dir = path.join(ROOT, ".release-reports");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const file = path.join(dir, `release-report-${currentVersion}-${stamp}.md`);

  const lines = [
    `# Release readiness report — v${currentVersion}`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `**Verdict: ${ready ? "✅ PRODUCTION READY" : "❌ NOT READY"}** — ${failed.length} failure(s), ${warned.length} warning(s)`,
    ``,
    `| Stage | Check | Status | Detail |`,
    `| ----- | ----- | ------ | ------ |`,
    ...results.map((r) => `| ${r.stage} | ${r.name} | ${r.status.toUpperCase()} | ${r.detail?.replace(/\|/g, "\\|") ?? ""} |`),
  ];
  fs.writeFileSync(file, lines.join("\n") + "\n");

  header("Readiness report");
  console.log(`  Verdict: ${ready ? c.green(c.bold("PRODUCTION READY")) : c.red(c.bold("NOT READY"))}`);
  if (failed.length) failed.forEach((r) => console.log(`  ${c.red("✘")} ${r.stage}: ${r.name}`));
  if (warned.length) warned.forEach((r) => console.log(`  ${c.yellow("⚠")} ${r.stage}: ${r.name} ${c.dim(r.detail ?? "")}`));
  console.log(c.dim(`  Full report: ${path.relative(ROOT, file)}`));
  return ready;
}

// ---------------------------------------------------------------- stage 5
function bumpVersion(v, type) {
  const [maj, min, pat] = v.split(".").map(Number);
  return type === "major" ? `${maj + 1}.0.0` : type === "minor" ? `${maj}.${min + 1}.0` : `${maj}.${min}.${pat + 1}`;
}

/**
 * templates/ and examples/ are not pnpm workspace members, so changesets
 * never touches them — their exact `@expressots/*` pins are rewritten here
 * to the released version and committed with the release.
 */
function syncPinnedVersions(newVersion) {
  const names = new Set(workspacePackages().filter(({ pkg }) => !pkg.private).map(({ pkg }) => pkg.name));
  const touched = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== "dist") walk(full);
      } else if (entry.name === "package.json") {
        const raw = fs.readFileSync(full, "utf8");
        const pkg = JSON.parse(raw);
        let changed = false;
        for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
          for (const dep of Object.keys(pkg[section] ?? {})) {
            if (names.has(dep) && pkg[section][dep] !== newVersion) { pkg[section][dep] = newVersion; changed = true; }
          }
        }
        if (changed) {
          const indent = raw.match(/^[ \t]+/m)?.[0] ?? "  ";
          fs.writeFileSync(full, JSON.stringify(pkg, null, indent) + "\n");
          touched.push(path.relative(ROOT, full));
        }
      }
    }
  };
  for (const top of ["templates", "examples"]) {
    const dir = path.join(ROOT, top);
    if (fs.existsSync(dir)) walk(dir);
  }
  return touched;
}

async function versionStage(currentVersion) {
  header("Stage 5 · Version bump");

  let range = "";
  try { range = `${sh("git describe --tags --abbrev=0")}..HEAD`; }
  catch { range = "HEAD~50..HEAD"; }
  const subjects = sh(`git log ${range} --pretty=%s`).split("\n").filter(Boolean);
  const breaking = subjects.filter((s) => /^\w+(\(.+\))?!:/.test(s)).length
    + Number(sh(`git log ${range} --grep="BREAKING CHANGE" --pretty=%H | wc -l`));
  const feats = subjects.filter((s) => /^feat(\(.+\))?:/.test(s)).length;
  const fixes = subjects.filter((s) => /^fix(\(.+\))?:/.test(s)).length;

  const suggested = breaking > 0 ? "major" : feats > 0 ? "minor" : "patch";
  console.log(`  Commits since last tag (${c.dim(range)}): ${subjects.length} total — ${breaking} breaking, ${feats} feat, ${fixes} fix`);
  console.log(`  Suggested bump: ${c.bold(suggested)} (${currentVersion} → ${bumpVersion(currentVersion, suggested)})`);

  let type = suggested;
  let summary = "";
  if (!YES) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(`  Accept '${suggested}'? [Enter=yes / major / minor / patch / q=abort] `)).trim().toLowerCase();
    if (answer === "q") { rl.close(); return null; }
    if (["major", "minor", "patch"].includes(answer)) type = answer;
    summary = (await rl.question(`  One-line release summary [Release v${bumpVersion(currentVersion, type)}]: `)).trim();
    rl.close();
  }
  const newVersion = bumpVersion(currentVersion, type);
  summary ||= `Release v${newVersion}`;

  const fixedGroup = JSON.parse(fs.readFileSync(path.join(ROOT, ".changeset/config.json"), "utf8")).fixed[0];
  const publishableNames = new Set(workspacePackages().filter(({ pkg }) => !pkg.private).map(({ pkg }) => pkg.name));
  const frontmatter = fixedGroup.filter((n) => publishableNames.has(n)).map((n) => `"${n}": ${type}`).join("\n");
  fs.writeFileSync(path.join(ROOT, `.changeset/release-${newVersion}.md`), `---\n${frontmatter}\n---\n\n${summary}\n`);

  sh("pnpm changeset version", { stdio: ["ignore", "inherit", "inherit"] });
  const pinned = syncPinnedVersions(newVersion);
  if (pinned.length) record("version", `templates/examples pinned to v${newVersion}`, "pass", `${pinned.length} package.json file(s)`);
  sh("git add -A");
  sh(`git commit -m "chore(release): v${newVersion}"`, { stdio: ["ignore", "pipe", "pipe"] });
  record("version", `bumped to v${newVersion} and committed`, "pass", `changelogs updated`);
  return newVersion;
}

// ---------------------------------------------------------------- stage 6
async function publishStage(newVersion) {
  header("Stage 6 · Publish to npm");

  try { sh("npm whoami"); }
  catch {
    record("publish", "npm authenticated", "fail", "run `npm login`, then publish with: pnpm changeset publish");
    return false;
  }

  if (!YES) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(`  Publish v${newVersion} to npm and sync expressots/templates? [y/N] `)).trim().toLowerCase();
    rl.close();
    if (answer !== "y") {
      console.log(c.yellow(`  Skipped. Publish later with: pnpm changeset publish && git push --follow-tags`));
      console.log(c.yellow(`  (remember: the v${newVersion} CLI needs the matching expressots/templates tag — rerun with the templates sync)`));
      return false;
    }
  }
  execSync("pnpm changeset publish", { cwd: ROOT, stdio: "inherit" });
  record("publish", `published v${newVersion}`, "pass");
  return true;
}

// ---------------------------------------------------------------- stage 7
/**
 * The monorepo's templates/ directory is the source of truth, but installed
 * CLIs scaffold with `degit expressots/templates/<folder>#v<cli version>` —
 * a small standalone repo, so `ex new` downloads ~360 KB instead of the
 * whole monorepo tree. This stage replaces that repo's content with
 * templates/ and pushes the version tag the freshly published CLI expects.
 */
function templatesSyncStage(newVersion) {
  header("Stage 7 · Sync templates -> expressots/templates");
  if (SKIP_TEMPLATES) { record("templates", "sync + tag", "skip", "--skip-templates"); return true; }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-templates-"));
  const repo = path.join(tmp, "templates");
  const start = Date.now();
  try {
    sh(`git clone --depth 1 ${TEMPLATES_REPO} ${JSON.stringify(repo)}`);
    for (const entry of fs.readdirSync(repo)) {
      if (entry !== ".git") fs.rmSync(path.join(repo, entry), { recursive: true, force: true });
    }
    fs.cpSync(path.join(ROOT, "templates"), repo, {
      recursive: true,
      filter: (src) => !src.includes("node_modules"),
    });

    const dirty = sh("git status --porcelain", { cwd: repo });
    if (dirty) {
      sh("git add -A", { cwd: repo });
      sh(`git commit -m "chore(release): sync from expressots/expressots v${newVersion}"`, { cwd: repo });
    }
    sh(`git tag v${newVersion}`, { cwd: repo });
    sh("git push origin HEAD --follow-tags", { cwd: repo });
    record("templates", `synced and tagged v${newVersion}`, "pass", dirty ? "content updated" : "no content changes, tag only", (Date.now() - start) / 1000);
    return true;
  } catch (err) {
    record("templates", `synced and tagged v${newVersion}`, "fail", String(err.message).split("\n")[0]);
    console.log(c.red(`  Templates sync failed — 'ex new' is broken for v${newVersion} until the tag exists.`));
    console.log(c.yellow(`  Recover manually: clone ${TEMPLATES_REPO}, replace its content with the monorepo's templates/,`));
    console.log(c.yellow(`  then: git add -A && git commit -m "chore(release): sync v${newVersion}" && git tag v${newVersion} && git push origin HEAD --follow-tags`));
    return false;
  }
}

// ---------------------------------------------------------------- main
const currentVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "packages/core/package.json"), "utf8")).version;
console.log(c.bold(`ExpressoTS release pipeline — current version v${currentVersion}${REPORT_ONLY ? " (report only)" : ""}`));

const okPreflight = preflight();
const okVerify = verify();
const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-pack-"));
const { ok: okPack, tarballs } = packChecks(packDir);
const okSmoke = await smokeTest(tarballs);

const ready = writeReport(currentVersion) && okPreflight && okVerify && okPack && okSmoke;

if (REPORT_ONLY) process.exit(ready ? 0 : 1);
if (!ready) {
  console.log(c.red(c.bold("\nAborting: fix the failures above before releasing.")));
  process.exit(1);
}

const newVersion = await versionStage(currentVersion);
if (!newVersion) { console.log(c.yellow("Aborted at version stage.")); process.exit(1); }
const published = await publishStage(newVersion);
if (published) {
  const synced = templatesSyncStage(newVersion);
  console.log(c.bold(`\n  Done. Push commits and tags: ${c.cyan("git push --follow-tags")}`));
  process.exit(synced ? 0 : 1);
}
