/**
 * Template loader for CI/CD generators
 * Handles remote template fetching with fallback to embedded templates
 */

import { getTemplateManager, type RenderOptions } from "../../templates";
import type { GeneratorOptions } from "./github-actions";

export interface TemplateResult {
	content: string;
	source: "remote" | "embedded";
}

/**
 * Load CI/CD template with fallback
 */
export async function loadCICDTemplate(
	platform: string,
	strategy: string,
	options: GeneratorOptions,
	embeddedGenerator: (options: GeneratorOptions) => string,
): Promise<TemplateResult> {
	const manager = getTemplateManager();

	try {
		// Try to fetch from remote template repository
		const result = await manager.fetchCICDTemplate(
			platform as any,
			strategy as any,
		);

		if (result.data) {
			// Template found, render with variables
			const renderOptions: RenderOptions = {
				variables: {
					projectName: options.projectName,
					nodeVersion: options.nodeVersion,
					packageManager: options.packageManager,
					strategy: options.strategy,
					includeSecurity: options.includeSecurity,
					includeE2E: options.includeE2E,
					includeCoverage: options.includeCoverage,
					dockerRegistry: options.dockerRegistry || "ghcr.io",
					deployTarget: options.deployTarget,
					branch: options.branch,
					port: options.port,
					// Computed variables
					installCmd: getInstallCommand(options.packageManager),
					testCmd: getTestCommand(options.packageManager),
					buildCmd: getBuildCommand(options.packageManager),
					lintCmd: getLintCommand(options.packageManager),
				},
				conditionals: {
					includeSecurity: options.includeSecurity,
					includeE2E: options.includeE2E,
					includeCoverage: options.includeCoverage,
					isComprehensive: options.strategy === "comprehensive",
					isSecurityFocused: options.strategy === "security-focused",
					hasDeployTarget: options.deployTarget !== "none",
					deployKubernetes: options.deployTarget === "kubernetes",
					deployRailway: options.deployTarget === "railway",
					deployRender: options.deployTarget === "render",
					deployFly: options.deployTarget === "fly",
					deployECS: options.deployTarget === "ecs",
					deployCloudRun: options.deployTarget === "cloudrun",
				},
			};

			const rendered = manager.render(result.data, renderOptions);
			return { content: rendered, source: "remote" };
		}
	} catch {
		// Remote fetch failed, fall back to embedded
	}

	// Fall back to embedded template generator
	return {
		content: embeddedGenerator(options),
		source: "embedded",
	};
}

/**
 * Get install command for package manager
 */
function getInstallCommand(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm install";
		case "yarn":
			return "yarn install";
		default:
			return "npm ci";
	}
}

/**
 * Get test command for package manager
 */
function getTestCommand(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm test";
		case "yarn":
			return "yarn test";
		default:
			return "npm test";
	}
}

/**
 * Get build command for package manager
 */
function getBuildCommand(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm build";
		case "yarn":
			return "yarn build";
		default:
			return "npm run build";
	}
}

/**
 * Get lint command for package manager
 */
function getLintCommand(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm lint";
		case "yarn":
			return "yarn lint";
		default:
			return "npm run lint";
	}
}

/**
 * Log template source for debugging
 */
export function logTemplateSource(
	platform: string,
	source: "remote" | "embedded",
): void {
	if (process.env.EXPRESSOTS_DEBUG) {
		const sourceLabel =
			source === "remote" ? "remote template" : "embedded template";
		console.log(`  [DEBUG] ${platform}: Using ${sourceLabel}`);
	}
}
