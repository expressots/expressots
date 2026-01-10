import * as fs from "fs";
import * as path from "path";
import { AutoDetection } from "../features/auto-detection";

// Mock fs module
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
  },
}));

describe("AutoDetection", () => {
  let autoDetect: AutoDetection;
  const mockExistsSync = fs.existsSync as jest.Mock;
  const mockReadFile = fs.promises.readFile as jest.Mock;
  const mockReaddir = fs.promises.readdir as jest.Mock;

  beforeEach(() => {
    autoDetect = new AutoDetection();
    jest.clearAllMocks();
  });

  describe("detectEngine", () => {
    it("should detect React when react and react-dom are installed", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {
            react: "^18.0.0",
            "react-dom": "^18.0.0",
          },
        }),
      );
      mockReaddir.mockResolvedValue([]);

      const engine = await autoDetect.detectEngine();
      expect(engine).toBe("react");
    });

    it("should detect EJS when ejs is installed", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {
            ejs: "^3.0.0",
          },
        }),
      );
      mockReaddir.mockResolvedValue([]);

      const engine = await autoDetect.detectEngine();
      expect(engine).toBe("ejs");
    });

    it("should detect Pug when pug is installed", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {
            pug: "^3.0.0",
          },
        }),
      );
      mockReaddir.mockResolvedValue([]);

      const engine = await autoDetect.detectEngine();
      expect(engine).toBe("pug");
    });

    it("should detect Handlebars when hbs is installed", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {
            hbs: "^4.0.0",
          },
        }),
      );
      mockReaddir.mockResolvedValue([]);

      const engine = await autoDetect.detectEngine();
      expect(engine).toBe("hbs");
    });

    it("should prioritize React over EJS", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {
            react: "^18.0.0",
            "react-dom": "^18.0.0",
            ejs: "^3.0.0",
          },
        }),
      );
      mockReaddir.mockResolvedValue([]);

      const engine = await autoDetect.detectEngine();
      expect(engine).toBe("react");
    });

    it("should fall back to scanning view files when no packages found", async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p.includes("views");
      });
      mockReadFile.mockResolvedValue(JSON.stringify({}));
      mockReaddir.mockResolvedValue(["index.ejs", "about.ejs"]);

      const engine = await autoDetect.detectEngine();
      expect(engine).toBe("ejs");
    });

    it("should default to EJS when nothing detected", async () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFile.mockRejectedValue(new Error("File not found"));
      mockReaddir.mockResolvedValue([]);

      const engine = await autoDetect.detectEngine();
      expect(engine).toBe("ejs");
    });
  });

  describe("getInstalledEngines", () => {
    it("should return list of installed engines", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {
            ejs: "^3.0.0",
            pug: "^3.0.0",
          },
          devDependencies: {
            hbs: "^4.0.0",
          },
        }),
      );

      const engines = await autoDetect.getInstalledEngines();
      expect(engines).toContain("ejs");
      expect(engines).toContain("pug");
      expect(engines).toContain("hbs");
    });

    it("should return empty array when package.json not found", async () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFile.mockRejectedValue(new Error("File not found"));

      const engines = await autoDetect.getInstalledEngines();
      expect(engines).toEqual([]);
    });
  });

  describe("scanViewFiles", () => {
    it("should find view files in common directories", async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p.includes("views");
      });
      mockReaddir.mockResolvedValue([
        "index.ejs",
        "about.pug",
        "contact.hbs",
        "readme.txt",
      ]);

      const extensions = await autoDetect.scanViewFiles();
      expect(extensions).toContain(".ejs");
      expect(extensions).toContain(".pug");
      expect(extensions).toContain(".hbs");
      expect(extensions).not.toContain(".txt");
    });

    it("should return empty array when no view directories exist", async () => {
      mockExistsSync.mockReturnValue(false);

      const extensions = await autoDetect.scanViewFiles();
      expect(extensions).toEqual([]);
    });
  });

  describe("mapExtensionToEngine", () => {
    it("should map .ejs to ejs", () => {
      expect(autoDetect.mapExtensionToEngine(".ejs")).toBe("ejs");
    });

    it("should map .pug to pug", () => {
      expect(autoDetect.mapExtensionToEngine(".pug")).toBe("pug");
    });

    it("should map .jade to pug", () => {
      expect(autoDetect.mapExtensionToEngine(".jade")).toBe("pug");
    });

    it("should map .hbs to hbs", () => {
      expect(autoDetect.mapExtensionToEngine(".hbs")).toBe("hbs");
    });

    it("should map .tsx to react", () => {
      expect(autoDetect.mapExtensionToEngine(".tsx")).toBe("react");
    });

    it("should default to ejs for unknown extensions", () => {
      expect(autoDetect.mapExtensionToEngine(".unknown")).toBe("ejs");
    });
  });

  describe("isEngineAvailable", () => {
    beforeEach(() => {
      // Mock require.resolve
      jest.spyOn(require, "resolve").mockImplementation((modulePath: string) => {
        if (modulePath === "ejs") return "/node_modules/ejs/index.js";
        throw new Error("Module not found");
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return true for installed engine", () => {
      expect(autoDetect.isEngineAvailable("ejs")).toBe(true);
    });

    it("should return false for non-installed engine", () => {
      expect(autoDetect.isEngineAvailable("pug")).toBe(false);
    });
  });
});
