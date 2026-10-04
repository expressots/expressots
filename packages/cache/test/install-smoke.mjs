/** Packed-package acceptance, without publishing. Run after building cache, core, adapter and CLI. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const temporary = await fs.mkdtemp(
  path.join(os.tmpdir(), "expressots-cache-install-"),
);
const app = path.join(temporary, "cache-app");
const env = {
  ...process.env,
  npm_config_cache: path.join(temporary, "npm-cache"),
  EXPRESSOTS_DEV: "1",
  EXPRESSOTS_USE_LOCAL_TEMPLATES: "1",
  EXPRESSOTS_SKIP_INSTALL: "1",
};
const records = new Map();
const log = path.join(temporary, "commands.log");

async function run(command, args, cwd = root, extraEnv = {}) {
  console.log(`$ ${command} ${args.join(" ")}`);
  await fs.appendFile(log, `$ ${command} ${args.join(" ")}\n`);
  const child = spawn(command, args, {
    cwd,
    env: { ...env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 600_000,
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (data) => {
      output += data;
    });
  const status = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  await fs.appendFile(log, output);
  assert.equal(status, 0, output.slice(-6000));
}

for (const directory of ["shared", "core", "adapter-express", "cli", "cache"]) {
  const cwd = path.join(root, "packages", directory);
  await run("pnpm", ["pack", "--pack-destination", temporary], cwd);
  const manifest = JSON.parse(
    await fs.readFile(path.join(cwd, "package.json"), "utf8"),
  );
  const filename = `${manifest.name.replace(/^@/, "").replace("/", "-")}-${manifest.version}.tgz`;
  const tarball = await fs.readFile(path.join(temporary, filename));
  records.set(manifest.name, { manifest, filename, tarball });
}

// Inspect the packed manifest, rather than assuming workspace:* was rewritten.
await run("tar", [
  "-xzf",
  path.join(temporary, records.get("@expressots/cache").filename),
  "-C",
  temporary,
]);
const packed = JSON.parse(
  await fs.readFile(path.join(temporary, "package/package.json"), "utf8"),
);
assert.equal(packed.name, "@expressots/cache");
assert.equal(packed.peerDependenciesMeta.ioredis.optional, true);
assert.ok(!JSON.stringify(packed).includes("workspace:"));
for (const target of [
  packed.main,
  packed.types,
  packed.exports["."].import.default,
  packed.exports["."].import.types,
]) {
  await fs.access(path.join(temporary, "package", target));
}

// A read-only local registry. No publish endpoint; only packed framework metadata/tarballs.
let registryBase;
const registry = createServer((request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url, "http://localhost").pathname,
  );
  const record = records.get(pathname.slice(1));
  if (record) {
    const manifest = { ...record.manifest };
    if (manifest.dependencies)
      manifest.dependencies = Object.fromEntries(
        Object.entries(manifest.dependencies).map(([name, version]) => [
          name,
          version.startsWith("workspace:")
            ? records.get(name).manifest.version
            : version,
        ]),
      );
    manifest.dist = {
      tarball: `${registryBase}/tarballs/${record.filename}`,
      shasum: createHash("sha1").update(record.tarball).digest("hex"),
    };
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        name: manifest.name,
        "dist-tags": { latest: manifest.version },
        versions: { [manifest.version]: manifest },
      }),
    );
    return;
  }
  const tarball = [...records.values()].find(
    (item) => pathname === `/tarballs/${item.filename}`,
  );
  if (tarball) {
    response.end(tarball.tarball);
    return;
  }
  response.writeHead(404);
  response.end("Package not in local fixture registry");
});
await new Promise((resolve) => registry.listen(0, "127.0.0.1", resolve));
registryBase = `http://127.0.0.1:${registry.address().port}`;

async function roundTrip(driver) {
  const probe = createTcpServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const child = spawn(process.execPath, ["dist/src/main.js"], {
    cwd: app,
    env: {
      ...env,
      PORT: String(port),
      NODE_ENV: "test",
      CACHE_DRIVER: driver,
      CACHE_NAMESPACE: path.basename(temporary),
      REDIS_URL: process.env.CACHE_TEST_REDIS_URL ?? "redis://127.0.0.1:6379",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (data) => {
      output += data;
    });
  const exited = new Promise((resolve) => child.on("close", resolve));
  try {
    const deadline = Date.now() + 30_000;
    let response;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(output);
      try {
        response = await fetch(`http://127.0.0.1:${port}/api/cache-smoke`, {
          signal: AbortSignal.timeout(500),
        });
        if (response.ok) break;
      } catch {
        /* Wait for HTTP readiness with a bounded deadline. */
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(response?.ok, output);
    assert.deepEqual(await response.json(), {
      value: false,
      driver,
      healthy: true,
    });
    console.log(
      `${driver}: compiled fresh app started and completed HTTP cache round trip`,
    );
  } finally {
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    await exited;
    clearTimeout(timer);
    await fs.appendFile(log, output);
  }
}

try {
  // Real CLI, supported local-template mode; no remote template/version assumption.
  await run(
    process.execPath,
    [
      path.join(root, "packages/cli/bin/cli.js"),
      "new",
      "cache-app",
      "-t",
      "application",
      "-p",
      "npm",
      "--preset",
      "minimal",
    ],
    temporary,
  );
  const manifestPath = path.join(app, "package.json");
  const applicationManifest = JSON.parse(
    await fs.readFile(manifestPath, "utf8"),
  );
  // Optional Studio developer tools are unrelated to this cache fixture.
  delete applicationManifest.devDependencies["@expressots/studio"];
  delete applicationManifest.devDependencies["@expressots/studio-agent"];
  await fs.writeFile(
    manifestPath,
    JSON.stringify(applicationManifest, null, 2),
  );
  await fs.writeFile(
    path.join(app, ".npmrc"),
    `@expressots:registry=${registryBase}\n`,
  );
  await run("npm", ["install", "--no-audit", "--no-fund"], app);
  const installedCli = path.join(
    app,
    "node_modules/@expressots/cli/bin/cli.js",
  );
  await run(process.execPath, [installedCli, "add", "@expressots/cache"], app);
  const installedManifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  assert.ok(installedManifest.dependencies["@expressots/cache"]);

  // Check both published module entries, without the optional peer or workspace resolution.
  await run(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    assert.throws(() => require.resolve('ioredis'));
    const Module = require('node:module'); const load = Module._load;
    Module._load = function(name, ...args) { assert.notEqual(name, 'ioredis'); return load.call(this, name, ...args); };
    const { CacheProvider } = require('@expressots/cache');
    const cache = new CacheProvider(); await cache.bootstrap(); await cache.set('x', false);
    assert.equal(await cache.get('x'), false); await cache.shutdown();
    Module._load = load;
    const esm = await import('@expressots/cache'); const memory = new esm.CacheProvider();
    await memory.bootstrap(); await memory.set('x', null); assert.equal(await memory.get('x'), null); await memory.shutdown();
    for (const Provider of [CacheProvider, esm.CacheProvider]) {
      const redis = new Provider(); redis.configure({ driver: 'redis' });
      await assert.rejects(redis.bootstrap(), /npm install ioredis/); await redis.shutdown();
    }
  `,
    ],
    app,
  );

  const appFile = path.join(app, "src/app.ts");
  let application = await fs.readFile(appFile, "utf8");
  application =
    `import { CacheProvider } from '@expressots/cache';\nimport { CacheSmokeController } from './cache-smoke.controller';\n` +
    application;
  application = application.replace(
    "CreateModule([AppController])",
    "CreateModule([AppController, CacheSmokeController, CacheProvider])",
  );
  await fs.writeFile(appFile, application);
  await fs.writeFile(
    path.join(app, "src/cache-smoke.controller.ts"),
    `
    import { controller, Get } from '@expressots/adapter-express';
    import { inject } from '@expressots/core';
    import { CacheProvider } from '@expressots/cache';
    @controller('/cache-smoke')
    export class CacheSmokeController {
      constructor(@inject(CacheProvider) private readonly cache: CacheProvider) {}
      @Get('/') async roundTrip() {
        await this.cache.set('smoke', false, 0);
        const value = await this.cache.get('smoke'); await this.cache.del('smoke');
        return { value, driver: this.cache.mode, healthy: (await this.cache.healthCheck()).status === 'healthy' };
      }
    }
  `,
  );
  await run("npm", ["run", "build"], app);
  await roundTrip("memory");
  if (!process.env.CACHE_TEST_REDIS_URL)
    throw new Error(
      "Memory checks passed; CACHE_TEST_REDIS_URL is required for Redis install acceptance",
    );
  await run(
    "npm",
    ["install", "ioredis@5.6.1", "--no-audit", "--no-fund"],
    app,
  );
  await roundTrip("redis");

  const example = path.join(temporary, "example-10");
  await fs.cp(path.join(root, "examples/10-redis-cache"), example, {
    recursive: true,
    filter: (source) =>
      !["node_modules", "dist", "coverage"].includes(path.basename(source)),
  });
  await fs.writeFile(
    path.join(example, ".npmrc"),
    `@expressots:registry=${registryBase}\n`,
  );
  await run("npm", ["install", "--no-audit", "--no-fund"], example);
  await run("npm", ["run", "build"], example);
  await run("npm", ["test"], example);
  await run("npm", ["run", "lint"], example);
  console.log(
    "Example 10: packed dependencies, build, HTTP integration tests and lint passed",
  );
  console.log(
    `PASS: ex new, ex add @expressots/cache, CJS/ESM, missing-peer behavior, build, memory without ioredis and Redis with explicit peer. Evidence: ${temporary}`,
  );
} finally {
  await new Promise((resolve) => registry.close(resolve));
  // Retain the isolated fixture and command log for inspection; nothing is published.
  console.log(`Fixture and logs retained in ${temporary}`);
}
