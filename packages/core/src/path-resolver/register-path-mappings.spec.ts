import * as fs from "fs";
import * as os from "os";
import * as path from "path";

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
      jest.doMock("module", () => {
        const actual = jest.requireActual("module") as any;
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
});
