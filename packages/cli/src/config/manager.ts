/**
 * Global configuration manager for ExpressoTS CLI
 * Manages user preferences stored in ~/.expressots/config.json
 */

import fs from "fs";
import path from "path";
import os from "os";
import { printWarning } from "../utils/cli-ui";

const CONFIG_DIR = path.join(os.homedir(), ".expressots");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export interface TemplateConfig {
	repository: string;
	branch: string;
	cacheTTL: number;
}

export interface PricingConfig {
	sources: ("api" | "remote" | "local")[];
	cacheTTL: number;
	customFile: string | null;
}

export interface GlobalConfig {
	templates: TemplateConfig;
	pricing: PricingConfig;
	offline: boolean;
}

const DEFAULT_CONFIG: GlobalConfig = {
	templates: {
		repository: "expressots/templates",
		branch: "main",
		cacheTTL: 86400, // 24 hours
	},
	pricing: {
		sources: ["api", "remote", "local"],
		cacheTTL: 21600, // 6 hours
		customFile: null,
	},
	offline: false,
};

/**
 * Returns a deep clone of the default config so callers can mutate
 * their copy without poisoning the module-level constant. A previous
 * implementation used `{ ...DEFAULT_CONFIG }` which kept the inner
 * `templates`/`pricing` objects shared, so `setTemplateRepository`
 * mutated the defaults and broke `reset()`.
 */
function freshDefaults(): GlobalConfig {
	return {
		templates: { ...DEFAULT_CONFIG.templates },
		pricing: {
			...DEFAULT_CONFIG.pricing,
			sources: [...DEFAULT_CONFIG.pricing.sources],
		},
		offline: DEFAULT_CONFIG.offline,
	};
}

export class ConfigManager {
	private config: GlobalConfig;
	private configPath: string;

	constructor() {
		this.configPath = CONFIG_FILE;
		this.config = this.load();
	}

	/**
	 * Ensure config directory exists
	 */
	private ensureConfigDir(): void {
		if (!fs.existsSync(CONFIG_DIR)) {
			fs.mkdirSync(CONFIG_DIR, { recursive: true });
		}
	}

	/**
	 * Load configuration from file
	 */
	private load(): GlobalConfig {
		if (!fs.existsSync(this.configPath)) {
			return freshDefaults();
		}

		let content: string;
		try {
			content = fs.readFileSync(this.configPath, "utf-8");
		} catch (err) {
			printWarning(
				`Could not read ${this.configPath}: ${(err as Error).message}. Falling back to defaults.`,
				"config",
			);
			return freshDefaults();
		}

		try {
			const loaded = JSON.parse(content);
			if (
				loaded === null ||
				typeof loaded !== "object" ||
				Array.isArray(loaded)
			) {
				printWarning(
					`${this.configPath} is not a JSON object. Falling back to defaults.`,
					"config",
				);
				return freshDefaults();
			}
			return this.mergeWithDefaults(loaded);
		} catch (err) {
			printWarning(
				`${this.configPath} is not valid JSON: ${(err as Error).message}. Falling back to defaults.`,
				"config",
			);
			return freshDefaults();
		}
	}

	/**
	 * Merge loaded config with defaults
	 */
	private mergeWithDefaults(loaded: Partial<GlobalConfig>): GlobalConfig {
		return {
			templates: {
				...DEFAULT_CONFIG.templates,
				...loaded.templates,
			},
			pricing: {
				...DEFAULT_CONFIG.pricing,
				...loaded.pricing,
			},
			offline: loaded.offline ?? DEFAULT_CONFIG.offline,
		};
	}

	/**
	 * Save configuration to file
	 */
	save(): void {
		this.ensureConfigDir();
		fs.writeFileSync(
			this.configPath,
			JSON.stringify(this.config, null, 2),
			"utf-8",
		);
	}

	/**
	 * Get full configuration
	 */
	getConfig(): GlobalConfig {
		return { ...this.config };
	}

	/**
	 * Get template configuration
	 */
	getTemplateConfig(): TemplateConfig {
		return { ...this.config.templates };
	}

	/**
	 * Get pricing configuration
	 */
	getPricingConfig(): PricingConfig {
		return { ...this.config.pricing };
	}

	/**
	 * Set template repository
	 */
	setTemplateRepository(repository: string, branch?: string): void {
		this.config.templates.repository = repository;
		if (branch) {
			this.config.templates.branch = branch;
		}
		this.save();
	}

	/**
	 * Reset template repository to default
	 */
	resetTemplateRepository(): void {
		this.config.templates = { ...DEFAULT_CONFIG.templates };
		this.save();
	}

	/**
	 * Set template cache TTL
	 */
	setTemplateCacheTTL(ttl: number): void {
		this.config.templates.cacheTTL = ttl;
		this.save();
	}

	/**
	 * Set pricing sources
	 */
	setPricingSources(sources: ("api" | "remote" | "local")[]): void {
		this.config.pricing.sources = sources;
		this.save();
	}

	/**
	 * Set custom pricing file
	 */
	setCustomPricingFile(filePath: string | null): void {
		this.config.pricing.customFile = filePath;
		this.save();
	}

	/**
	 * Set pricing cache TTL
	 */
	setPricingCacheTTL(ttl: number): void {
		this.config.pricing.cacheTTL = ttl;
		this.save();
	}

	/**
	 * Set offline mode
	 */
	setOfflineMode(offline: boolean): void {
		this.config.offline = offline;
		this.save();
	}

	/**
	 * Get offline mode
	 */
	isOffline(): boolean {
		return this.config.offline;
	}

	/**
	 * Reset all configuration to defaults
	 */
	reset(): void {
		this.config = freshDefaults();
		this.save();
	}

	/**
	 * Get config file path
	 */
	getConfigPath(): string {
		return this.configPath;
	}

	/**
	 * Get config directory path
	 */
	getConfigDir(): string {
		return CONFIG_DIR;
	}
}

// Singleton instance
let configInstance: ConfigManager | null = null;

export function getConfigManager(): ConfigManager {
	if (!configInstance) {
		configInstance = new ConfigManager();
	}
	return configInstance;
}

export function resetConfigManager(): void {
	configInstance = null;
}
