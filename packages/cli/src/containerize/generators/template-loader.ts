/**
 * Template loader for containerize generators
 * Handles remote template fetching with fallback to embedded templates
 */

import { getTemplateManager, type RenderOptions } from "../../templates";
import type { ProjectAnalysis } from "../analyzers/project-analyzer";

export interface DockerTemplateVars {
	nodeVersion: string;
	packageManager: string;
	entryPoint: string;
	port: number;
	hasLocalDeps: boolean;
	healthCheckEndpoint: string;
	projectName: string;
	installCommand: string;
	buildCommand: string;
}

export interface TemplateResult {
	content: string;
	source: "remote" | "embedded";
}

/**
 * Load Docker template with fallback
 */
export async function loadDockerTemplate(
	templateType: string,
	variables: DockerTemplateVars,
	embeddedGenerator: () => string
): Promise<TemplateResult> {
	const manager = getTemplateManager();

	try {
		// Try to fetch from remote template repository
		const result = await manager.fetchDockerTemplate(templateType);

		if (result.data) {
			// Template found, render with variables
			const renderOptions: RenderOptions = {
				variables: {
					...variables,
				},
				conditionals: {
					hasLocalDeps: variables.hasLocalDeps,
					useNpmCi: !variables.hasLocalDeps,
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
		content: embeddedGenerator(),
		source: "embedded",
	};
}

/**
 * Load Kubernetes template with fallback
 */
export async function loadKubernetesTemplate(
	templateType: string,
	variables: Record<string, unknown>,
	embeddedGenerator: () => string
): Promise<TemplateResult> {
	const manager = getTemplateManager();

	try {
		// Try to fetch from remote template repository
		const result = await manager.fetchKubernetesTemplate(templateType);

		if (result.data) {
			// Template found, render with variables
			const renderOptions: RenderOptions = {
				variables: variables as Record<string, string | number | boolean | undefined>,
			};

			const rendered = manager.render(result.data, renderOptions);
			return { content: rendered, source: "remote" };
		}
	} catch {
		// Remote fetch failed, fall back to embedded
	}

	// Fall back to embedded template generator
	return {
		content: embeddedGenerator(),
		source: "embedded",
	};
}

/**
 * Build Docker template variables from analysis
 */
export function buildDockerVars(
	analysis: ProjectAnalysis | undefined,
	entryPoint: string,
	packageManager: string = "npm"
): DockerTemplateVars {
	return {
		nodeVersion: analysis?.nodeVersion || "20",
		packageManager,
		entryPoint,
		port: analysis?.port || 3000,
		hasLocalDeps: analysis?.hasLocalDependencies || false,
		healthCheckEndpoint: analysis?.healthCheckPaths?.[0] || "/health",
		projectName: "expressots-app",
		installCommand: getInstallCommand(packageManager, analysis?.hasLocalDependencies),
		buildCommand: getBuildCommand(packageManager),
	};
}

/**
 * Get install command for package manager
 */
function getInstallCommand(packageManager: string, hasLocalDeps?: boolean): string {
	if (hasLocalDeps) {
		// Use npm install when local deps exist (npm ci doesn't work well with local deps)
		return packageManager === "pnpm" ? "pnpm install" :
			packageManager === "yarn" ? "yarn install" : "npm install";
	}
	
	switch (packageManager) {
		case "pnpm":
			return "pnpm install --frozen-lockfile";
		case "yarn":
			return "yarn install --frozen-lockfile";
		default:
			return "npm ci";
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
 * Log template source for debugging
 */
export function logTemplateSource(templateName: string, source: "remote" | "embedded"): void {
	if (process.env.EXPRESSOTS_DEBUG) {
		const sourceLabel = source === "remote" ? "remote template" : "embedded template";
		console.log(`  [DEBUG] ${templateName}: Using ${sourceLabel}`);
	}
}
