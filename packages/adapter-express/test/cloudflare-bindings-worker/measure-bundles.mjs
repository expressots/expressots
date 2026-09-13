/**
 * Bundle gate for cloudflareBindings().
 *
 * Builds two Workers with `wrangler deploy --dry-run` and compares them:
 *   base      micro() + cloudflareAdapter(), no bindings
 *   bindings  the same app resolving all four binding kinds
 *
 * Fails when the providers add more than ADDED_LIMIT gzip bytes, when the
 * base bundle exceeds BASE_LIMIT (a regression like the 141 KiB AppExpress
 * import recorded in micro.ts), or when either bundle contains AppExpress.
 *
 * Run from this directory after `pnpm install --ignore-workspace`; the
 * adapter is linked from the monorepo, so build it first.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const outRoot = join(here, ".bundle-out");
const wranglerBin = join(here, "node_modules", "wrangler", "bin", "wrangler.js");

// Base measured at ~209 KiB gzip on 2026-09-12 (Wrangler 4.120, the
// monorepo's lib/ output); #961 reported ~202 KiB for the published 4.2.1
// packages. The ceiling leaves room for dependency drift but catches
// anything dragging the DI stack into the Worker again (that mistake cost
// 141 KiB, see micro.ts).
const BASE_LIMIT = 215 * 1024;
// A token factory and a per-request closure should cost well under 1 KiB.
const ADDED_LIMIT = 1024;

const scenarios = {
  base: "bundle/base.ts",
  bindings: "bundle/bindings.ts",
};

if (!existsSync(wranglerBin)) {
  throw new Error(
    `Wrangler is not installed in this fixture (${wranglerBin}); run pnpm install --ignore-workspace here first`,
  );
}

function build(name, entry) {
  const outDir = join(outRoot, name);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const result = spawnSync(
    process.execPath,
    [
      wranglerBin,
      "deploy",
      entry,
      "--config",
      "wrangler.bundle.toml",
      "--dry-run",
      "--outdir",
      outDir,
    ],
    {
      cwd: here,
      encoding: "utf8",
      env: {
        ...process.env,
        // A measurement must not phone home or prompt.
        WRANGLER_SEND_METRICS: "false",
        CI: "true",
        NO_COLOR: "1",
      },
    },
  );
  if (result.status !== 0 || result.error) {
    throw new Error(
      `wrangler dry-run failed for ${name}\n${result.stdout}\n${result.stderr}${result.error ? `\n${result.error.message}` : ""}`,
    );
  }

  const files = readdirSync(outDir)
    .filter((file) => [".js", ".mjs", ".cjs"].includes(extname(file)))
    .map((file) => join(outDir, file));
  if (files.length === 0) {
    throw new Error(`wrangler dry-run for ${name} produced no JavaScript in ${outDir}`);
  }

  const buffers = files.map((file) => readFileSync(file));
  return {
    files: files.map((file) => ({ file: file.slice(here.length + 1), bytes: statSync(file).size })),
    rawBytes: buffers.reduce((total, buffer) => total + buffer.byteLength, 0),
    gzipBytes: buffers.reduce((total, buffer) => total + gzipSync(buffer).byteLength, 0),
    includesAppExpress: buffers.some((buffer) => buffer.includes("AppExpress")),
  };
}

const measurements = Object.fromEntries(
  Object.entries(scenarios).map(([name, entry]) => [name, build(name, entry)]),
);
const added = {
  rawBytes: measurements.bindings.rawBytes - measurements.base.rawBytes,
  gzipBytes: measurements.bindings.gzipBytes - measurements.base.gzipBytes,
};

const kib = (bytes) => `${(bytes / 1024).toFixed(2)} KiB`;
console.log(
  JSON.stringify(
    {
      base: { raw: kib(measurements.base.rawBytes), gzip: kib(measurements.base.gzipBytes) },
      bindings: {
        raw: kib(measurements.bindings.rawBytes),
        gzip: kib(measurements.bindings.gzipBytes),
      },
      added: { raw: `${added.rawBytes} B`, gzip: `${added.gzipBytes} B` },
      limits: { baseGzip: kib(BASE_LIMIT), addedGzip: `${ADDED_LIMIT} B` },
    },
    null,
    2,
  ),
);

const failures = [];
for (const [name, measurement] of Object.entries(measurements)) {
  if (measurement.includesAppExpress) failures.push(`${name} bundle contains AppExpress`);
}
if (measurements.base.gzipBytes > BASE_LIMIT) {
  failures.push(`base bundle ${kib(measurements.base.gzipBytes)} gzip exceeds ${kib(BASE_LIMIT)}`);
}
if (added.gzipBytes > ADDED_LIMIT) {
  failures.push(`bindings add ${added.gzipBytes} B gzip, limit ${ADDED_LIMIT} B`);
}

if (failures.length > 0) {
  console.error(`Bundle gate failed:\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log("Bundle gate passed.");
