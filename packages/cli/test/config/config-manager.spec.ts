/**
 * Unit tests for the global `ConfigManager` (`~/.expressots/config.json`).
 *
 * The CONFIG_DIR / CONFIG_FILE constants are computed at module load
 * from `os.homedir()`. We therefore mock `os.homedir` BEFORE the
 * import so all reads/writes target a per-test temp dir and never
 * touch the real user's config file.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const TMP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-cfg-"));

jest.mock("os", () => {
	const actual = jest.requireActual("os");
	return {
		...actual,
		homedir: () => TMP_HOME,
	};
});

// Suppress the printWarning side-effect so test output stays clean.
jest.mock("../../src/utils/cli-ui", () => ({
	printWarning: jest.fn(),
	printError: jest.fn(),
	printSuccess: jest.fn(),
	printInfo: jest.fn(),
	printDebug: jest.fn(),
	printHeader: jest.fn(),
	printGenerateError: jest.fn(),
	printGenerateSuccess: jest.fn(),
}));

import {
	ConfigManager,
	getConfigManager,
	resetConfigManager,
} from "../../src/config/manager";

const CFG_DIR = path.join(TMP_HOME, ".expressots");
const CFG_FILE = path.join(CFG_DIR, "config.json");

function clearConfigFile(): void {
	if (fs.existsSync(CFG_FILE)) fs.unlinkSync(CFG_FILE);
}

describe("ConfigManager", () => {
	beforeEach(() => {
		clearConfigFile();
		resetConfigManager();
	});

	afterAll(() => {
		try {
			if (fs.existsSync(CFG_FILE)) fs.unlinkSync(CFG_FILE);
			if (fs.existsSync(CFG_DIR)) fs.rmdirSync(CFG_DIR);
			fs.rmdirSync(TMP_HOME);
		} catch {
			// best-effort cleanup
		}
	});

	describe("defaults", () => {
		it("returns default config when no file exists", () => {
			const cfg = new ConfigManager().getConfig();
			expect(cfg.templates.repository).toBe("expressots/templates");
			expect(cfg.templates.branch).toBe("main");
			expect(cfg.pricing.sources).toEqual(["api", "remote", "local"]);
			expect(cfg.offline).toBe(false);
		});

		it("getConfigPath returns the resolved file path", () => {
			expect(new ConfigManager().getConfigPath()).toBe(CFG_FILE);
		});

		it("getConfigDir returns the resolved dir path", () => {
			expect(new ConfigManager().getConfigDir()).toBe(CFG_DIR);
		});
	});

	describe("persistence", () => {
		it("creates the config dir on save", () => {
			const mgr = new ConfigManager();
			mgr.setOfflineMode(true);
			expect(fs.existsSync(CFG_DIR)).toBe(true);
			expect(fs.existsSync(CFG_FILE)).toBe(true);
		});

		it("round-trips template repo overrides", () => {
			const mgr = new ConfigManager();
			mgr.setTemplateRepository("acme/templates", "v9");
			const reloaded = new ConfigManager();
			expect(reloaded.getTemplateConfig().repository).toBe(
				"acme/templates",
			);
			expect(reloaded.getTemplateConfig().branch).toBe("v9");
		});

		it("round-trips pricing sources", () => {
			const mgr = new ConfigManager();
			mgr.setPricingSources(["local"]);
			const reloaded = new ConfigManager();
			expect(reloaded.getPricingConfig().sources).toEqual(["local"]);
		});

		it("merges loaded config with defaults for missing keys", () => {
			fs.mkdirSync(CFG_DIR, { recursive: true });
			fs.writeFileSync(
				CFG_FILE,
				JSON.stringify({ templates: { repository: "x/y" } }),
				"utf-8",
			);
			const mgr = new ConfigManager();
			expect(mgr.getTemplateConfig().repository).toBe("x/y");
			// branch should fall back to default
			expect(mgr.getTemplateConfig().branch).toBe("main");
			expect(mgr.getPricingConfig().sources).toEqual([
				"api",
				"remote",
				"local",
			]);
		});

		it("falls back to defaults on corrupted JSON", () => {
			fs.mkdirSync(CFG_DIR, { recursive: true });
			fs.writeFileSync(CFG_FILE, "{not valid json", "utf-8");
			const mgr = new ConfigManager();
			expect(mgr.getTemplateConfig().repository).toBe(
				"expressots/templates",
			);
		});

		it("falls back to defaults when JSON root is not an object", () => {
			fs.mkdirSync(CFG_DIR, { recursive: true });
			fs.writeFileSync(CFG_FILE, "[]", "utf-8");
			const mgr = new ConfigManager();
			expect(mgr.getTemplateConfig().repository).toBe(
				"expressots/templates",
			);
		});
	});

	describe("reset", () => {
		it("reset() restores all defaults and persists", () => {
			const mgr = new ConfigManager();
			mgr.setTemplateRepository("foo/bar");
			mgr.setOfflineMode(true);
			mgr.reset();
			expect(mgr.getTemplateConfig().repository).toBe(
				"expressots/templates",
			);
			expect(mgr.isOffline()).toBe(false);
		});

		it("resetTemplateRepository only resets templates", () => {
			const mgr = new ConfigManager();
			mgr.setTemplateRepository("foo/bar", "v9");
			mgr.setOfflineMode(true);
			mgr.resetTemplateRepository();
			expect(mgr.getTemplateConfig().repository).toBe(
				"expressots/templates",
			);
			expect(mgr.isOffline()).toBe(true);
		});
	});

	describe("singleton", () => {
		it("getConfigManager returns the same instance", () => {
			const a = getConfigManager();
			const b = getConfigManager();
			expect(a).toBe(b);
		});

		it("resetConfigManager forces a new instance", () => {
			const a = getConfigManager();
			resetConfigManager();
			const b = getConfigManager();
			expect(a).not.toBe(b);
		});
	});
});
