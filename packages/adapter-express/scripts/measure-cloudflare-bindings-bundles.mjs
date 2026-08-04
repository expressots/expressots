import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceDir = resolve(packageDir, "..", "..");
const fixtureDir = join(packageDir, "test", "cloudflare-bindings-worker");
const packageManagerCli = process.env.npm_execpath;
const sourceAliasValue = '"./src/shims/iconv-lite.cjs"';
const wranglerCliPath = join(packageDir, "node_modules", "wrangler", "bin", "wrangler.js");
const localPackages = [
  { name: "@expressots/shared", directory: join(workspaceDir, "packages", "shared") },
  { name: "@expressots/core", directory: join(workspaceDir, "packages", "core") },
  {
    name: "@expressots/adapter-express",
    directory: packageDir,
  },
];
const maxBaseGzipBytes = 205 * 1024;
const maxAddedGzipBytes = 1024;
const relativeCeiling = 1.1;
const temporaryParent = mkdtempSync(join(tmpdir(), "expressots-bindings-bundle-"));
const wranglerOutputDir = join(temporaryParent, "wrangler");

function processFailure(label, result) {
  const details = [result.stdout, result.stderr, result.error?.message].filter(Boolean).join("\n");
  return new Error(`${label} failed${details ? `\n${details}` : ""}`);
}

function runPnpm(cwd, args, label) {
  if (!packageManagerCli) {
    throw new Error("Run this check through the package's pnpm script");
  }
  const result = spawnSync(process.execPath, [packageManagerCli, ...args], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    throw processFailure(label, result);
  }
  return result;
}

function assertPinnedWrangler() {
  if (!existsSync(wranglerCliPath)) {
    throw new Error(`Package-local Wrangler CLI is missing at ${wranglerCliPath}`);
  }
  const { version } = JSON.parse(
    readFileSync(join(packageDir, "node_modules", "wrangler", "package.json")),
  );
  if (version !== "4.118.0") {
    throw new Error(`Expected package-local Wrangler 4.118.0, found ${version}`);
  }
}

function runWrangler(cwd, args, label) {
  const result = spawnSync(process.execPath, [wranglerCliPath, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: join(wranglerOutputDir, "logs"),
      WRANGLER_CACHE_DIR: join(wranglerOutputDir, "cache"),
      XDG_CACHE_HOME: join(wranglerOutputDir, "cache"),
      XDG_CONFIG_HOME: join(wranglerOutputDir, "config"),
    },
  });
  if (result.status !== 0 || result.error) {
    throw processFailure(label, result);
  }
}

function packLocalPackage(localPackage, packsDir) {
  const packagePacksDir = join(packsDir, localPackage.name.replace("@expressots/", ""));
  mkdirSync(packagePacksDir, { recursive: true });
  runPnpm(
    localPackage.directory,
    ["pack", "--pack-destination", packagePacksDir],
    `Packing ${localPackage.name}`,
  );
  const tarballs = readdirSync(packagePacksDir).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1) {
    throw new Error(`Packing ${localPackage.name} produced ${tarballs.length} tarballs`);
  }
  return join(packagePacksDir, tarballs[0]);
}

function writeConsumer(packedPackages, consumerDir) {
  const dependencies = Object.fromEntries(
    Object.entries(packedPackages).map(([name, tarball]) => [
      name,
      `file:${relative(consumerDir, tarball).replaceAll("\\", "/")}`,
    ]),
  );
  writeFileSync(
    join(consumerDir, "package.json"),
    `${JSON.stringify(
      {
        name: "expressots-cloudflare-bindings-bundle-consumer",
        private: true,
        type: "module",
        packageManager: "pnpm@10.14.0",
        dependencies,
        pnpm: { overrides: dependencies },
      },
      null,
      2,
    )}\n`,
  );
  cpSync(join(fixtureDir, "bundle"), join(consumerDir, "bundle"), {
    recursive: true,
  });
  cpSync(join(fixtureDir, "src"), join(consumerDir, "src"), {
    recursive: true,
  });

  const sourceConfig = readFileSync(join(fixtureDir, "wrangler.bundle.toml"), "utf8");
  if (!sourceConfig.includes(sourceAliasValue)) {
    throw new Error("Expected iconv-lite alias in bundle config; config drifted");
  }
  const runtimeAliasValue = `"${join(consumerDir, "src", "shims", "iconv-lite.cjs").replaceAll(
    "\\",
    "/",
  )}"`;
  writeFileSync(
    join(consumerDir, "wrangler.bundle.toml"),
    sourceConfig.replace(sourceAliasValue, runtimeAliasValue),
  );
}

function listCodeFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listCodeFiles(path);
    return [".js", ".mjs", ".cjs"].includes(extname(path)) ? [path] : [];
  });
}

function measureScenario(name, consumerDir, outDir) {
  runWrangler(
    consumerDir,
    [
      "deploy",
      join(consumerDir, "bundle", `${name === "allBindings" ? "all-bindings" : name}.ts`),
      "--config",
      join(consumerDir, "wrangler.bundle.toml"),
      "--dry-run",
      "--outdir",
      outDir,
    ],
    `Wrangler dry-run for ${name}`,
  );
  if (!existsSync(outDir)) {
    throw new Error(`Wrangler dry-run for ${name} produced no output directory`);
  }
  const files = listCodeFiles(outDir);
  if (files.length === 0) {
    throw new Error(`Wrangler dry-run for ${name} produced no JavaScript output`);
  }
  const contents = files.map((file) => readFileSync(file));
  const rawBytes = contents.reduce((total, contents) => total + contents.byteLength, 0);
  const gzipBytes = contents.reduce((total, contents) => total + gzipSync(contents).byteLength, 0);
  return {
    rawBytes,
    gzipBytes,
    appExpressPresent: contents.some((contents) =>
      contents.toString("utf8").includes("AppExpress"),
    ),
  };
}

function withKiB(bytes) {
  return { bytes, kibibytes: bytes / 1024 };
}

try {
  assertPinnedWrangler();
  const packsDir = join(temporaryParent, "packs");
  const consumerDir = join(temporaryParent, "consumer");
  mkdirSync(packsDir, { recursive: true });
  mkdirSync(consumerDir, { recursive: true });
  const packedPackages = Object.fromEntries(
    localPackages.map((localPackage) => [
      localPackage.name,
      packLocalPackage(localPackage, packsDir),
    ]),
  );
  writeConsumer(packedPackages, consumerDir);
  runPnpm(
    consumerDir,
    ["install", "--ignore-scripts", "--offline", "--config.node-linker=hoisted"],
    "Installing packed consumer",
  );

  const measurements = {
    base: measureScenario("base", consumerDir, join(temporaryParent, "base")),
    enabled: measureScenario("enabled", consumerDir, join(temporaryParent, "enabled")),
    allBindings: measureScenario("allBindings", consumerDir, join(temporaryParent, "all-bindings")),
  };
  const base = measurements.base;
  const deltas = Object.fromEntries(
    ["enabled", "allBindings"].map((name) => [
      name,
      {
        raw: withKiB(measurements[name].rawBytes - base.rawBytes),
        gzip: withKiB(measurements[name].gzipBytes - base.gzipBytes),
      },
    ]),
  );
  const gates = {
    baseGzip: {
      maximum: withKiB(maxBaseGzipBytes),
      actual: withKiB(base.gzipBytes),
      passed: base.gzipBytes <= maxBaseGzipBytes,
    },
    enabledGzip: {
      maximumAdded: withKiB(maxAddedGzipBytes),
      actualAdded: deltas.enabled.gzip,
      passed: deltas.enabled.gzip.bytes <= maxAddedGzipBytes,
    },
    allBindingsGzip: {
      maximumAdded: withKiB(maxAddedGzipBytes),
      actualAdded: deltas.allBindings.gzip,
      passed: deltas.allBindings.gzip.bytes <= maxAddedGzipBytes,
    },
    relativeCeiling: Object.fromEntries(
      ["enabled", "allBindings"].map((name) => [
        name,
        {
          maximum: withKiB(base.gzipBytes * relativeCeiling),
          actual: withKiB(measurements[name].gzipBytes),
          passed: measurements[name].gzipBytes <= base.gzipBytes * relativeCeiling,
        },
      ]),
    ),
  };
  const report = {
    measurements: Object.fromEntries(
      Object.entries(measurements).map(([name, measurement]) => [
        name,
        {
          raw: withKiB(measurement.rawBytes),
          gzip: withKiB(measurement.gzipBytes),
          appExpressPresent: measurement.appExpressPresent,
        },
      ]),
    ),
    deltas,
    gates,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  const failures = [
    !gates.baseGzip.passed && "base gzip exceeds 205 KiB",
    !gates.enabledGzip.passed && "enabled gzip adds more than 1 KiB",
    !gates.allBindingsGzip.passed && "allBindings gzip adds more than 1 KiB",
    ...Object.entries(gates.relativeCeiling)
      .filter(([, gate]) => !gate.passed)
      .map(([name]) => `${name} exceeds the 110% relative ceiling`),
  ].filter(Boolean);
  if (failures.length > 0) {
    throw new Error(`Cloudflare binding bundle gate failed: ${failures.join("; ")}`);
  }
} finally {
  rmSync(temporaryParent, { recursive: true, force: true });
}
