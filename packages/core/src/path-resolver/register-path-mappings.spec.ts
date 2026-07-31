import { spawnSync } from "node:child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

describe("registerPathMappings", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "expressots-register-paths-"),
    );
    delete (global as any).__expressotsPathMappings;

    fs.mkdirSync(path.join(tmpDir, "src", "useCases"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src", "useCases", "list.js"),
      "module.exports = {};",
      "utf-8",
    );
  });

  afterEach(() => {
    delete (global as any).__expressotsPathMappings;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("resolves aliases with regex metacharacters via the global fallback store", () => {
    jest.isolateModules(() => {
      jest.doMock("node:module", () => {
        const actual = jest.requireActual("node:module") as any;
        const resolveFilename = actual._resolveFilename;
        const target: any = { ...actual };

        Object.defineProperty(target, "_resolveFilename", {
          configurable: false,
          enumerable: true,
          get() {
            return resolveFilename;
          },
          set() {
            throw new TypeError("read-only");
          },
        });

        return target;
      });

      const { registerPathMappings } =
        require("./index") as typeof import("./index");

      registerPathMappings({
        baseUrl: "./src",
        paths: { "@useCases+/*": ["useCases/*"] },
        rootDir: tmpDir,
      });

      const mappings = (global as any).__expressotsPathMappings;
      expect(mappings).toBeDefined();
      expect(mappings.resolve("@useCases+/list")).toBe(
        path.join(tmpDir, "src", "useCases", "list.js"),
      );
    });
  });

  it("patches the resolver without assigning to the imported property", () => {
    let importedModule: any;
    let assignmentCount = 0;

    jest.isolateModules(() => {
      jest.doMock("node:module", () => {
        const actual = jest.requireActual("node:module") as any;
        const resolveFilename = actual._resolveFilename;
        importedModule = { ...actual };

        Object.defineProperty(importedModule, "_resolveFilename", {
          configurable: true,
          enumerable: true,
          get() {
            return resolveFilename;
          },
          set() {
            assignmentCount += 1;
          },
        });

        return importedModule;
      });

      const { registerPathMappings } =
        require("./index") as typeof import("./index");

      registerPathMappings({
        baseUrl: "./src",
        paths: { "@primary/*": ["useCases/*"] },
        rootDir: tmpDir,
      });
    });

    expect(assignmentCount).toBe(0);
    expect(
      Object.getOwnPropertyDescriptor(importedModule, "_resolveFilename"),
    ).toEqual(
      expect.objectContaining({
        value: expect.any(Function),
        writable: true,
        configurable: true,
      }),
    );
  });

  it("patches Node module resolution when loaded as ESM", () => {
    const sourcePath = path.join(__dirname, "index.ts");
    const esmPath = path.join(tmpDir, "path-resolver.mjs");
    const runnerPath = path.join(tmpDir, "runner.mjs");

    const transpiled = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
      compilerOptions: {
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: sourcePath,
      reportDiagnostics: true,
    });

    const errors = (transpiled.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
    expect(errors).toEqual([]);

    fs.writeFileSync(esmPath, transpiled.outputText, "utf8");
    fs.writeFileSync(
      runnerPath,
      [
        'import { createRequire } from "node:module";',
        `import { registerPathMappings } from ${JSON.stringify(
          pathToFileURL(esmPath).href,
        )};`,
        "",
        "registerPathMappings({",
        '  baseUrl: "./src",',
        '  paths: { "@esm/*": ["useCases/*"] },',
        `  rootDir: ${JSON.stringify(tmpDir)},`,
        "});",
        "",
        "const require = createRequire(import.meta.url);",
        'require("@esm/list");',
        'process.stdout.write("resolved");',
        "",
      ].join("\n"),
      "utf8",
    );

    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect({
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    }).toEqual({
      status: 0,
      stdout: "resolved",
      stderr: "",
    });
  });
});
