/**
 * Template loader for migration generators
 * Handles remote template fetching with fallback to embedded templates
 */

import { getTemplateManager, type RenderOptions } from "../../templates";
import {
	detectPackageManagerOrDefault,
	getCiInstallCommand,
	getRunScriptCommand,
} from "../../utils/package-manager-commands";
import type { MigrationOptions } from "../form";

export interface TemplateResult {
	content: string;
	source: "remote" | "embedded";
}

/**
 * Load migration template with fallback
 */
export async function loadMigrationTemplate(
	from: string,
	to: string,
	file: string,
	variables: Record<string, unknown>,
	embeddedGenerator: () => string,
): Promise<TemplateResult> {
	const manager = getTemplateManager();

	try {
		// Try to fetch from remote template repository
		const result = await manager.fetchMigrationTemplate(from, to, file);

		if (result.data) {
			// Template found, render with variables
			const renderOptions: RenderOptions = {
				variables: variables as Record<
					string,
					string | number | boolean | undefined
				>,
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
 * Build migration template variables
 */
export function buildMigrationVars(
	options: MigrationOptions,
): Record<string, unknown> {
	// Migrations run in the project root, so detect the package manager
	// from the on-disk lockfile to emit matching build/start commands in
	// the generated platform configs (Render/Railway/Fly, etc.).
	const packageManager = detectPackageManagerOrDefault();
	const installCommand = getCiInstallCommand(packageManager);
	const buildScript = getRunScriptCommand(packageManager, "build");
	const buildCommand = `${installCommand} && ${buildScript}`;
	const startCommand = getRunScriptCommand(packageManager, "start");

	return {
		from: options.from,
		to: options.to,
		includeSecrets: options.includeSecrets,
		includeData: options.includeData,
		dryRun: options.dryRun,
		outputDir: options.outputDir,
		packageManager,
		installCommand,
		buildCommand,
		startCommand,
	};
}

/**
 * Log template source for debugging
 */
export function logTemplateSource(
	templateName: string,
	source: "remote" | "embedded",
): void {
	if (process.env.EXPRESSOTS_DEBUG) {
		const sourceLabel =
			source === "remote" ? "remote template" : "embedded template";
		console.log(`  [DEBUG] ${templateName}: Using ${sourceLabel}`);
	}
}
