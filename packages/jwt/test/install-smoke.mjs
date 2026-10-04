/** Packed-package acceptance, without publishing. Run after building jwt, shared, core, adapter and CLI. */
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
  path.join(os.tmpdir(), "expressots-jwt-install-"),
);
const app = path.join(temporary, "jwt-app");
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
  return output;
}

for (const directory of ["shared", "core", "adapter-express", "cli", "jwt"]) {
  const cwd = path.join(root, "packages", directory);
  await run("pnpm", ["pack", "--pack-destination", temporary], cwd);
  const sourceManifest = JSON.parse(
    await fs.readFile(path.join(cwd, "package.json"), "utf8"),
  );
  const filename = `${sourceManifest.name.replace(/^@/, "").replace("/", "-")}-${sourceManifest.version}.tgz`;
  const tarball = await fs.readFile(path.join(temporary, filename));
  // Serve exactly the manifest npm receives after packing, including rewritten
  // workspace dependencies AND peer dependencies.
  const manifest = JSON.parse(
    await run("tar", [
      "-xOf",
      path.join(temporary, filename),
      "package/package.json",
    ]),
  );
  records.set(manifest.name, { manifest, filename, tarball });
}

// Inspect the packed manifest, rather than assuming workspace:* was rewritten.
await run("tar", [
  "-xzf",
  path.join(temporary, records.get("@expressots/jwt").filename),
  "-C",
  temporary,
]);
const packed = JSON.parse(
  await fs.readFile(path.join(temporary, "package/package.json"), "utf8"),
);
assert.equal(packed.name, "@expressots/jwt");
assert.ok(packed.dependencies.jose);
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

async function roundTrip() {
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
      JWT_SECRET: "test-only-secret-with-at-least-32-bytes!",
      JWT_ISSUER: "smoke",
      JWT_AUDIENCE: "api",
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
    const base = `http://127.0.0.1:${port}/api/jwt-smoke`;
    const deadline = Date.now() + 30000;
    let response;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(output);
      try {
        response = await fetch(`${base}/token`, {
          signal: AbortSignal.timeout(500),
        });
        if (response.ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(response?.ok, output);
    const pair = await response.json();
    const headers = { Authorization: `Bearer ${pair.accessToken}` };
    assert.equal((await fetch(`${base}/guard`)).status, 401);
    assert.equal(
      (
        await fetch(`${base}/guard`, {
          headers: { Authorization: "Bearer invalid" },
        })
      ).status,
      401,
    );
    const guard = await fetch(`${base}/guard`, { headers });
    assert.equal(guard.status, 200);
    assert.equal((await guard.json()).id, "smoke-user");
    const session = await fetch(`${base}/session`, { headers });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).id, "smoke-user");
    assert.equal((await fetch(`${base}/session`)).status, 401);
    assert.equal((await fetch(`${base}/admin`, { headers })).status, 403);
    const rotate = (token) =>
      fetch(`${base}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: token }),
      });
    const rotated = await rotate(pair.refreshToken);
    assert.equal(rotated.status, 201);
    const successor = await rotated.json();
    assert.equal((await rotate(pair.refreshToken)).status, 401);
    assert.equal((await rotate(successor.refreshToken)).status, 401);
    console.log(
      "Fresh app: guard, roles, permissions, session and refresh replay verified over HTTP",
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
      "jwt-app",
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
  // Optional Studio developer tools are unrelated to this jwt fixture.
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
  await run(process.execPath, [installedCli, "add", "@expressots/jwt"], app);
  const installedManifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  assert.ok(installedManifest.dependencies["@expressots/jwt"]);

  // Exercise both module entries with real signatures outside workspace resolution.
  await run(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    for (const mod of [require('@expressots/jwt'), await import('@expressots/jwt')]) {
      const p = new mod.JwtProvider();
      assert.equal(p.configure({ issuer: 'entry', audience: 'api', signing: { algorithm: 'HS256', key: { value: 'test-only-secret-with-at-least-32-bytes!' } } }).valid, true);
      await p.bootstrap(); assert.equal((await p.verifyAccessToken(await p.signAccessToken('user'))).sub, 'user'); await p.shutdown();
    }
  `,
    ],
    app,
  );

  await fs.writeFile(
    path.join(app, "src/app.ts"),
    `
    import { AppExpress, setupAuthorizationForExpress } from '@expressots/adapter-express';
    import { AppContainer, CreateModule } from '@expressots/core';
    import { JwtProvider, MemoryRefreshStore } from '@expressots/jwt';
    import { JwtSmokeController } from './jwt-smoke.controller';
    export class App extends AppExpress {
      private readonly container: AppContainer = this.configContainer([CreateModule([JwtProvider, JwtSmokeController])]);
      globalConfiguration(): void { this.setGlobalRoutePrefix('/api'); }
      async configureServices(): Promise<void> {
        this.Middleware.applyPreset('api');
        this.Middleware.setErrorHandler();
        const result = this.container.Container.get(JwtProvider).configure({ refreshStore: new MemoryRefreshStore() });
        if (!result.valid) throw new Error(result.errors?.join('; '));
        setupAuthorizationForExpress(this.container.Container, { enablePreloading: false }, this.Middleware);
        this.Middleware.session({ type: 'jwt' });
      }
      async postServerInitialization(): Promise<void> {}
      async serverShutdown(): Promise<void> {}
    }
  `,
  );
  await fs.writeFile(
    path.join(app, "src/jwt-smoke.controller.ts"),
    `
    import { controller, Get, Post, body, principal } from '@expressots/adapter-express';
    import { inject, RequireAuthentication, RequireRoles, RequirePermissions, UseGuards } from '@expressots/core';
    import { JwtProvider, JwtAuthGuard, JwtPrincipal } from '@expressots/jwt';
    @controller('/jwt-smoke')
    export class JwtSmokeController {
      constructor(@inject(JwtProvider) private readonly jwt: JwtProvider) {}
      // Test-only fixture issuance, not an application login implementation.
      @Get('/token') token() { return this.jwt.issueTokens('smoke-user', { roles: ['user'], permissions: ['profile:read'] }); }
      @Get('/guard') @UseGuards(JwtAuthGuard) @RequireRoles('user')
      guard(@principal() user: JwtPrincipal) { return user.details; }
      @Get('/session') @RequireAuthentication() @RequirePermissions('profile:read')
      session(@principal() user: JwtPrincipal) { return user.details; }
      @Get('/admin') @UseGuards(JwtAuthGuard) @RequireRoles('admin')
      admin(@principal() user: JwtPrincipal) { return user.details; }
      @Post('/refresh') refresh(@body() dto: { refreshToken: string }) { return this.jwt.rotateRefreshToken(dto.refreshToken); }
    }
  `,
  );
  await run("npm", ["run", "build"], app);
  await roundTrip();
  // Repeat with native ESM app imports. Core's plugin loader resolves CJS, so
  // this also proves registry lookup and the adapter context hook cross entries.
  const esmManifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  esmManifest.type = "module";
  await fs.writeFile(manifestPath, JSON.stringify(esmManifest, null, 2));
  const tsconfigPath = path.join(app, "tsconfig.json");
  const tsconfigText = await fs.readFile(tsconfigPath, "utf8");
  await fs.writeFile(
    tsconfigPath,
    tsconfigText
      .replace('"module": "commonjs"', '"module": "NodeNext"')
      .replace('"moduleResolution": "node"', '"moduleResolution": "NodeNext"'),
  );
  for (const name of ["app.ts", "main.ts"]) {
    const target = path.join(app, "src", name);
    const content = await fs.readFile(target, "utf8");
    await fs.writeFile(
      target,
      content.replace(/from ['"](\.\/[^'"]+)['"]/g, 'from "$1.js"'),
    );
  }
  await run("npm", ["run", "build"], app);
  await roundTrip();

  const example = path.join(temporary, "example-02");
  await fs.cp(path.join(root, "examples/02-jwt-authentication"), example, {
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
  await run("npm", ["test"], example, {
    NODE_OPTIONS: "--experimental-vm-modules",
  });
  await run("npm", ["run", "lint"], example);
  console.log(
    "Example 02: packed dependencies, build, HTTP integration tests and lint passed",
  );
  console.log(
    `PASS: ex new, ex add @expressots/jwt, CJS/ESM, build, protected HTTP routes, JWT sessions and refresh rotation. Evidence: ${temporary}`,
  );
} finally {
  await new Promise((resolve) => registry.close(resolve));
  // Retain the isolated fixture and command log for inspection; nothing is published.
  console.log(`Fixture and logs retained in ${temporary}`);
}
