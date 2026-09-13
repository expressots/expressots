import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The package.json `files` list names llms.txt, and npm silently skips a
// listed file that does not exist: 4.2.1 shipped without it because the file
// lived at the repository root. Keep it here, at the package root.
describe("llms.txt", () => {
  const packageRoot = join(__dirname, "..");
  const llmsPath = join(packageRoot, "llms.txt");

  it("ships at the package root", () => {
    expect(existsSync(llmsPath)).toBe(true);
    const files = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8"),
    ).files;
    expect(files).toContain("llms.txt");
  });

  it("teaches the v4 entry point and names the removed v3 APIs", () => {
    const text = readFileSync(llmsPath, "utf8");
    expect(text).toMatch(/await bootstrap\(App\)/);
    expect(text).toMatch(/## Do not use/);
    for (const removed of [
      "AppFactory",
      "InMemoryDataProvider",
      "LazyServiceIdentifer",
    ]) {
      expect(text).toContain(removed);
    }
  });
});
