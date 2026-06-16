import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadPathMappingsFromTsConfig } from "./index";

/**
 * `loadPathMappingsFromTsConfig` reads `compilerOptions.paths` from a
 * tsconfig relative to `process.cwd()`. These tests run in an isolated temp
 * dir so each scenario controls the tsconfig contents exactly.
 */
describe("loadPathMappingsFromTsConfig", () => {
  let originalCwd: string;
  let tmpDir: string;

  const writeTsconfig = (config: Record<string, unknown>): void => {
    fs.writeFileSync(
      path.join(tmpDir, "tsconfig.json"),
      JSON.stringify(config),
      "utf-8",
    );
  };

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-paths-"));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when the tsconfig defines no paths", () => {
    writeTsconfig({ compilerOptions: { outDir: "./dist" } });

    expect(loadPathMappingsFromTsConfig("./tsconfig.json")).toBeNull();
  });

  it("returns null when the tsconfig file is missing", () => {
    expect(loadPathMappingsFromTsConfig("./does-not-exist.json")).toBeNull();
  });

  it("resolves paths when baseUrl is omitted (v4 template convention)", () => {
    writeTsconfig({
      compilerOptions: {
        outDir: "./dist",
        paths: {
          "@useCases/*": ["./src/useCases/*"],
          "@providers/*": ["./src/providers/*"],
        },
      },
    });

    const config = loadPathMappingsFromTsConfig("./tsconfig.json");

    expect(config).not.toBeNull();
    // baseUrl defaults to "." and is joined with outDir.
    expect(config?.baseUrl).toBe(path.join("./dist", "."));
    expect(config?.paths).toEqual({
      "@useCases/*": ["./src/useCases/*"],
      "@providers/*": ["./src/providers/*"],
    });
    expect(config?.rootDir).toBe(process.cwd());
  });

  it("honors an explicit baseUrl relative to outDir (legacy convention)", () => {
    writeTsconfig({
      compilerOptions: {
        outDir: "./dist",
        baseUrl: "./src",
        paths: { "@useCases/*": ["useCases/*"] },
      },
    });

    const config = loadPathMappingsFromTsConfig("./tsconfig.json");

    expect(config?.baseUrl).toBe(path.join("./dist", "./src"));
  });

  it("defaults baseUrl to '.' when neither baseUrl nor outDir is set", () => {
    writeTsconfig({
      compilerOptions: { paths: { "@useCases/*": ["./src/useCases/*"] } },
    });

    const config = loadPathMappingsFromTsConfig("./tsconfig.json");

    expect(config?.baseUrl).toBe(".");
  });
});
