/**
 * Template Manager - orchestrates template fetching, caching, and rendering
 */

import chalk from "chalk";
import type {
	TemplateCategory,
	CICDPlatform,
	CIStrategy,
	TemplateManifest,
	RenderOptions,
	FetchResult,
} from "./types";
import { TemplateCache, getTemplateCache } from "./cache";
import { GitHubFetcher, getGitHubFetcher } from "./fetcher";
import { TemplateRenderer, getTemplateRenderer } from "./renderer";

export interface TemplateManagerConfig {
	repository?: string;
	branch?: string;
	cacheTTL?: number;
	offline?: boolean;
}

export class TemplateManager {
	private cache: TemplateCache;
	private fetcher: GitHubFetcher;
	private renderer: TemplateRenderer;
	private offline: boolean;
	private manifest: TemplateManifest | null = null;

	constructor(config?: TemplateManagerConfig) {
		this.cache = getTemplateCache({ ttl: config?.cacheTTL });
		this.fetcher = getGitHubFetcher({
			repository: config?.repository,
			branch: config?.branch,
		});
		this.renderer = getTemplateRenderer();
		this.offline = config?.offline ?? false;
	}

	/**
	 * Fetch and cache the template manifest
	 */
	async getManifest(
		forceRefresh: boolean = false,
	): Promise<TemplateManifest | null> {
		// Check memory cache first
		if (this.manifest && !forceRefresh) {
			return this.manifest;
		}

		// Check disk cache
		if (!forceRefresh) {
			const cached = this.cache.get<TemplateManifest>("manifest", "root");
			if (cached) {
				this.manifest = cached;
				return cached;
			}
		}

		// Fetch from remote (if not offline)
		if (!this.offline) {
			const result = await this.fetcher.fetchManifest();
			if (result.data) {
				this.manifest = result.data;
				this.cache.set("manifest", "root", result.data);
				return result.data;
			}
		}

		return null;
	}

	/**
	 * Fetch a template by type
	 */
	async fetchTemplate(
		category: TemplateCategory,
		platform: string,
		variant?: string,
	): Promise<FetchResult<string>> {
		const cacheKey = variant ? `${platform}-${variant}` : platform;

		// Check cache first
		const cached = this.cache.get<string>(category, cacheKey);
		if (cached) {
			return { data: cached, source: "cache" };
		}

		// If offline, return null
		if (this.offline) {
			return {
				data: null,
				source: "cache",
				error: "Offline mode - template not in cache",
			};
		}

		// Fetch from remote
		const result = await this.fetcher.fetchByType(
			category,
			platform,
			variant,
		);

		if (result.data) {
			// Cache the template
			this.cache.set(category, cacheKey, result.data);
			return { data: result.data, source: "remote" };
		}

		return result;
	}

	/**
	 * Fetch CI/CD template
	 */
	async fetchCICDTemplate(
		platform: CICDPlatform,
		strategy: CIStrategy = "basic",
	): Promise<FetchResult<string>> {
		return this.fetchTemplate("cicd", platform, strategy);
	}

	/**
	 * Fetch Docker template
	 */
	async fetchDockerTemplate(type: string): Promise<FetchResult<string>> {
		return this.fetchTemplate("docker", type);
	}

	/**
	 * Fetch Kubernetes template
	 */
	async fetchKubernetesTemplate(type: string): Promise<FetchResult<string>> {
		return this.fetchTemplate("kubernetes", type);
	}

	/**
	 * Fetch migration template
	 */
	async fetchMigrationTemplate(
		from: string,
		to: string,
		file?: string,
	): Promise<FetchResult<string>> {
		const migrationPath = `${from}-to-${to}`;
		return this.fetchTemplate("migrations", migrationPath, file);
	}

	/**
	 * Render a template with variables
	 */
	render(template: string, options: RenderOptions): string {
		return this.renderer.render(template, options);
	}

	/**
	 * Fetch and render template in one step
	 */
	async fetchAndRender(
		category: TemplateCategory,
		platform: string,
		variant: string | undefined,
		renderOptions: RenderOptions,
	): Promise<FetchResult<string>> {
		const fetchResult = await this.fetchTemplate(
			category,
			platform,
			variant,
		);

		if (!fetchResult.data) {
			return fetchResult;
		}

		const rendered = this.render(fetchResult.data, renderOptions);
		return { data: rendered, source: fetchResult.source };
	}

	/**
	 * Update all cached templates
	 */
	async updateCache(): Promise<{ updated: number; errors: string[] }> {
		const errors: string[] = [];
		let updated = 0;

		// Fetch fresh manifest
		const manifest = await this.getManifest(true);
		if (!manifest) {
			return { updated: 0, errors: ["Failed to fetch manifest"] };
		}

		// Update CI/CD templates
		if (manifest.templates.cicd) {
			for (const [platform, strategies] of Object.entries(
				manifest.templates.cicd,
			)) {
				for (const [strategy, info] of Object.entries(strategies)) {
					const result = await this.fetcher.fetchTemplate(info.path);
					if (result.data) {
						this.cache.set(
							"cicd",
							`${platform}-${strategy}`,
							result.data,
						);
						updated++;
					} else if (result.error) {
						errors.push(`${platform}/${strategy}: ${result.error}`);
					}
				}
			}
		}

		// Update Docker templates
		if (manifest.templates.docker) {
			for (const [type, info] of Object.entries(
				manifest.templates.docker,
			)) {
				const result = await this.fetcher.fetchTemplate(info.path);
				if (result.data) {
					this.cache.set("docker", type, result.data);
					updated++;
				} else if (result.error) {
					errors.push(`docker/${type}: ${result.error}`);
				}
			}
		}

		// Update Kubernetes templates
		if (manifest.templates.kubernetes) {
			for (const [type, info] of Object.entries(
				manifest.templates.kubernetes,
			)) {
				const result = await this.fetcher.fetchTemplate(info.path);
				if (result.data) {
					this.cache.set("kubernetes", type, result.data);
					updated++;
				} else if (result.error) {
					errors.push(`kubernetes/${type}: ${result.error}`);
				}
			}
		}

		return { updated, errors };
	}

	/**
	 * Clear template cache
	 */
	clearCache(): void {
		this.cache.clear();
		this.manifest = null;
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): {
		files: number;
		totalSize: number;
		oldestEntry: Date | null;
	} {
		return this.cache.getStats();
	}

	/**
	 * List available templates
	 */
	async listTemplates(): Promise<{
		cicd: Record<string, string[]>;
		docker: string[];
		kubernetes: string[];
		migrations: string[];
		source: "remote" | "embedded";
	}> {
		const manifest = await this.getManifest();

		// If remote manifest available, use it
		if (manifest) {
			const result = {
				cicd: {} as Record<string, string[]>,
				docker: [] as string[],
				kubernetes: [] as string[],
				migrations: [] as string[],
				source: "remote" as const,
			};

			// CI/CD templates
			if (manifest.templates.cicd) {
				for (const [platform, strategies] of Object.entries(
					manifest.templates.cicd,
				)) {
					result.cicd[platform] = Object.keys(strategies);
				}
			}

			// Docker templates
			if (manifest.templates.docker) {
				result.docker = Object.keys(manifest.templates.docker);
			}

			// Kubernetes templates
			if (manifest.templates.kubernetes) {
				result.kubernetes = Object.keys(manifest.templates.kubernetes);
			}

			// Migration templates
			if (manifest.templates.migrations) {
				for (const [from, targets] of Object.entries(
					manifest.templates.migrations,
				)) {
					for (const to of Object.keys(targets)) {
						result.migrations.push(`${from} → ${to}`);
					}
				}
			}

			return result;
		}

		// Fallback to embedded templates list
		return this.getEmbeddedTemplatesList();
	}

	/**
	 * Get list of embedded templates (fallback when remote unavailable)
	 */
	private getEmbeddedTemplatesList(): {
		cicd: Record<string, string[]>;
		docker: string[];
		kubernetes: string[];
		migrations: string[];
		source: "embedded";
	} {
		return {
			cicd: {
				github: ["basic", "comprehensive", "security-focused"],
				gitlab: ["basic", "comprehensive", "security-focused"],
				circleci: ["basic", "comprehensive"],
				jenkins: ["basic"],
				bitbucket: ["basic"],
				azure: ["basic"],
			},
			docker: [
				"production",
				"development",
				"compose",
				"compose-development",
			],
			kubernetes: ["deployment", "service", "configmap", "ingress"],
			migrations: [
				"heroku → railway",
				"heroku → render",
				"heroku → fly",
				"compose → kubernetes",
			],
			source: "embedded",
		};
	}

	/**
	 * Set repository for template fetching
	 */
	setRepository(repository: string, branch?: string): void {
		this.fetcher.setRepository(repository, branch);
		// Clear cache when repository changes
		this.clearCache();
	}

	/**
	 * Set offline mode
	 */
	setOfflineMode(offline: boolean): void {
		this.offline = offline;
	}

	/**
	 * Check if templates are available (cached or remote)
	 */
	async checkAvailability(): Promise<{
		online: boolean;
		cached: boolean;
		manifest: boolean;
	}> {
		const online = !this.offline && (await this.fetcher.checkConnection());
		const cached = this.cache.getStats().files > 0;
		const manifest = (await this.getManifest()) !== null;

		return { online, cached, manifest };
	}

	/**
	 * Validate a template
	 */
	validateTemplate(template: string): { valid: boolean; errors: string[] } {
		return this.renderer.validateTemplate(template);
	}

	/**
	 * Extract variables from template
	 */
	extractVariables(template: string): string[] {
		return this.renderer.extractVariables(template);
	}

	/**
	 * Print template status (for CLI output)
	 */
	async printStatus(): Promise<void> {
		const availability = await this.checkAvailability();
		const stats = this.getCacheStats();

		console.log(chalk.bold("\nTemplate System Status:\n"));

		console.log(
			`  Online:   ${availability.online ? chalk.green("✓") : chalk.red("✗")}`,
		);
		console.log(
			`  Cached:   ${availability.cached ? chalk.green("✓") : chalk.yellow("No templates cached")}`,
		);
		console.log(
			`  Manifest: ${availability.manifest ? chalk.green("✓") : chalk.yellow("Not loaded")}`,
		);

		console.log(chalk.bold("\nCache Statistics:\n"));
		console.log(`  Files:    ${stats.files}`);
		console.log(`  Size:     ${(stats.totalSize / 1024).toFixed(2)} KB`);
		console.log(
			`  Oldest:   ${stats.oldestEntry?.toLocaleString() || "N/A"}`,
		);
		console.log(`  Location: ${this.cache.getCacheDirectory()}`);
	}
}

// Singleton instance
let managerInstance: TemplateManager | null = null;

export function getTemplateManager(
	config?: TemplateManagerConfig,
): TemplateManager {
	if (!managerInstance) {
		managerInstance = new TemplateManager(config);
	}
	return managerInstance;
}

export function resetTemplateManager(): void {
	managerInstance = null;
}
