/**
 * Template fetcher - fetches templates from GitHub repository
 */

import https from "https";
import type { TemplateManifest, FetchResult } from "./types";

const DEFAULT_REPO = "expressots/templates";
const DEFAULT_BRANCH = "main";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com";
const FETCH_TIMEOUT = 5000; // 5 seconds for faster fallback

export interface FetcherConfig {
	repository: string;
	branch: string;
	timeout: number;
}

export class GitHubFetcher {
	private config: FetcherConfig;
	private retryCount: number = 1; // Single retry for faster fallback
	private retryDelay: number = 500;

	constructor(config?: Partial<FetcherConfig>) {
		this.config = {
			repository: config?.repository || DEFAULT_REPO,
			branch: config?.branch || DEFAULT_BRANCH,
			timeout: config?.timeout || FETCH_TIMEOUT,
		};
	}

	/**
	 * Build raw GitHub URL for a file
	 */
	private buildUrl(filePath: string): string {
		return `${GITHUB_RAW_BASE}/${this.config.repository}/${this.config.branch}/${filePath}`;
	}

	/**
	 * Fetch content from URL with retry logic
	 */
	private async fetchWithRetry(
		url: string,
		attempt: number = 1,
	): Promise<string> {
		return new Promise((resolve, reject) => {
			const request = https.get(
				url,
				{ timeout: this.config.timeout },
				(response) => {
					// Handle redirects
					if (
						response.statusCode === 301 ||
						response.statusCode === 302
					) {
						const redirectUrl = response.headers.location;
						if (redirectUrl) {
							this.fetchWithRetry(redirectUrl, attempt)
								.then(resolve)
								.catch(reject);
							return;
						}
					}

					if (response.statusCode === 404) {
						reject(new Error(`Template not found: ${url}`));
						return;
					}

					if (response.statusCode === 403) {
						// Rate limited
						if (attempt < this.retryCount) {
							setTimeout(
								() => {
									this.fetchWithRetry(url, attempt + 1)
										.then(resolve)
										.catch(reject);
								},
								this.retryDelay * Math.pow(2, attempt - 1),
							);
							return;
						}
						reject(new Error("GitHub API rate limit exceeded"));
						return;
					}

					if (response.statusCode !== 200) {
						reject(
							new Error(
								`HTTP ${response.statusCode}: Failed to fetch ${url}`,
							),
						);
						return;
					}

					let data = "";
					response.on("data", (chunk) => {
						data += chunk;
					});
					response.on("end", () => {
						resolve(data);
					});
				},
			);

			request.on("error", (error) => {
				if (attempt < this.retryCount) {
					setTimeout(
						() => {
							this.fetchWithRetry(url, attempt + 1)
								.then(resolve)
								.catch(reject);
						},
						this.retryDelay * Math.pow(2, attempt - 1),
					);
				} else {
					reject(error);
				}
			});

			request.on("timeout", () => {
				request.destroy();
				if (attempt < this.retryCount) {
					setTimeout(
						() => {
							this.fetchWithRetry(url, attempt + 1)
								.then(resolve)
								.catch(reject);
						},
						this.retryDelay * Math.pow(2, attempt - 1),
					);
				} else {
					reject(new Error(`Timeout fetching ${url}`));
				}
			});
		});
	}

	/**
	 * Fetch template manifest
	 */
	async fetchManifest(): Promise<FetchResult<TemplateManifest>> {
		try {
			const url = this.buildUrl("manifest.json");
			const content = await this.fetchWithRetry(url);
			const manifest: TemplateManifest = JSON.parse(content);
			return { data: manifest, source: "remote" };
		} catch (error) {
			return {
				data: null,
				source: "remote",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Fetch template content by path
	 */
	async fetchTemplate(templatePath: string): Promise<FetchResult<string>> {
		try {
			const url = this.buildUrl(templatePath);
			const content = await this.fetchWithRetry(url);
			return { data: content, source: "remote" };
		} catch (error) {
			return {
				data: null,
				source: "remote",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Fetch template by category, platform, and variant
	 */
	async fetchByType(
		category: string,
		platform: string,
		variant?: string,
	): Promise<FetchResult<string>> {
		// Build the path based on category
		let templatePath: string;

		switch (category) {
			case "cicd":
				templatePath = `cicd/${platform}/${variant || "basic"}.yml`;
				break;
			case "docker":
				templatePath = `docker/${platform}.tpl`;
				break;
			case "kubernetes":
				templatePath = `kubernetes/${platform}.yml.tpl`;
				break;
			case "migrations":
				templatePath = `migrations/${platform}/${variant || "checklist"}.md.tpl`;
				break;
			default:
				return {
					data: null,
					source: "remote",
					error: `Unknown template category: ${category}`,
				};
		}

		return this.fetchTemplate(templatePath);
	}

	/**
	 * Check if repository is accessible
	 */
	async checkConnection(): Promise<boolean> {
		try {
			const result = await this.fetchManifest();
			return result.data !== null;
		} catch {
			return false;
		}
	}

	/**
	 * Update repository configuration
	 */
	setRepository(repository: string, branch?: string): void {
		this.config.repository = repository;
		if (branch) {
			this.config.branch = branch;
		}
	}

	/**
	 * Get current configuration
	 */
	getConfig(): FetcherConfig {
		return { ...this.config };
	}
}

// Singleton instance
let fetcherInstance: GitHubFetcher | null = null;

export function getGitHubFetcher(
	config?: Partial<FetcherConfig>,
): GitHubFetcher {
	if (!fetcherInstance) {
		fetcherInstance = new GitHubFetcher(config);
	}
	return fetcherInstance;
}

export function resetFetcher(): void {
	fetcherInstance = null;
}
