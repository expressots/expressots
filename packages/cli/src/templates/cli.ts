/**
 * Templates CLI command
 * Manage template sources, cache, and configuration
 */

import { Argv, CommandModule } from "yargs";
import chalk from "chalk";
import { getTemplateManager } from "./manager";
import { getConfigManager } from "../config";

type CommandModuleArgs = Record<string, never>;

const templatesCommand = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "templates <action> [args...]",
		describe: "Manage CLI templates for CI/CD, Docker, and Kubernetes.",
		aliases: ["tpl"],
		builder: (yargs: Argv): Argv => {
			yargs.positional("action", {
				choices: ["list", "update", "clear", "info", "repo", "status"] as const,
				describe: "Action to perform",
				type: "string",
				demandOption: true,
			});

			yargs.positional("args", {
				describe: "Additional arguments for the action",
				type: "string",
				array: true,
			});

			yargs.option("category", {
				alias: "c",
				type: "string",
				describe: "Filter by category (cicd, docker, kubernetes, migrations)",
			});

			yargs.option("platform", {
				alias: "p",
				type: "string",
				describe: "Filter by platform (github, gitlab, etc.)",
			});

			yargs.example("$0 templates list", "List all available templates");
			yargs.example("$0 templates update", "Update template cache from remote");
			yargs.example("$0 templates clear", "Clear local template cache");
			yargs.example("$0 templates info cicd github", "Show template info");
			yargs.example("$0 templates repo set https://github.com/myorg/templates", "Set custom repository");
			yargs.example("$0 templates repo reset", "Reset to default repository");
			yargs.example("$0 templates status", "Show template system status");

			return yargs;
		},
		handler: async (argv) => {
			const action = argv.action as string;
			const args = argv.args as string[] || [];

			switch (action) {
				case "list":
					await listTemplates(argv.category as string, argv.platform as string);
					break;
				case "update":
					await updateTemplates();
					break;
				case "clear":
					await clearCache();
					break;
				case "info":
					await showTemplateInfo(args[0], args[1]);
					break;
				case "repo":
					await manageRepository(args);
					break;
				case "status":
					await showStatus();
					break;
				default:
					console.log(chalk.red(`Unknown action: ${action}`));
					console.log(chalk.gray("Run 'expressots templates --help' for usage."));
			}
		},
	};
};

/**
 * List available templates
 */
async function listTemplates(category?: string, platform?: string): Promise<void> {
	console.log(chalk.cyan("\n📋 Available Templates\n"));

	const manager = getTemplateManager();
	const templates = await manager.listTemplates();

	// Show template source
	const sourceLabel = templates.source === "remote"
		? chalk.green("(from remote repository)")
		: chalk.yellow("(embedded fallback)");
	console.log(chalk.gray(`  Source: ${sourceLabel}\n`));

	if (Object.keys(templates.cicd).length === 0 && templates.docker.length === 0 && templates.kubernetes.length === 0) {
		console.log(chalk.yellow("No templates available. Run 'expressots templates update' to fetch templates."));
		return;
	}

	// CI/CD Templates
	if (!category || category === "cicd") {
		console.log(chalk.bold("CI/CD Pipelines:"));
		if (Object.keys(templates.cicd).length === 0) {
			console.log(chalk.gray("  No CI/CD templates available"));
		} else {
			for (const [plat, strategies] of Object.entries(templates.cicd)) {
				if (!platform || platform === plat) {
					console.log(`  ${chalk.yellow(plat)}: ${strategies.join(", ")}`);
				}
			}
		}
		console.log();
	}

	// Docker Templates
	if (!category || category === "docker") {
		console.log(chalk.bold("Docker:"));
		if (templates.docker.length === 0) {
			console.log(chalk.gray("  No Docker templates available"));
		} else {
			for (const tpl of templates.docker) {
				console.log(`  ${chalk.cyan(tpl)}`);
			}
		}
		console.log();
	}

	// Kubernetes Templates
	if (!category || category === "kubernetes") {
		console.log(chalk.bold("Kubernetes:"));
		if (templates.kubernetes.length === 0) {
			console.log(chalk.gray("  No Kubernetes templates available"));
		} else {
			for (const tpl of templates.kubernetes) {
				console.log(`  ${chalk.green(tpl)}`);
			}
		}
		console.log();
	}

	// Migration Templates
	if (!category || category === "migrations") {
		console.log(chalk.bold("Migrations:"));
		if (templates.migrations.length === 0) {
			console.log(chalk.gray("  No migration templates available"));
		} else {
			for (const tpl of templates.migrations) {
				console.log(`  ${chalk.magenta(tpl)}`);
			}
		}
		console.log();
	}
}

/**
 * Update template cache
 */
async function updateTemplates(): Promise<void> {
	console.log(chalk.cyan("\n🔄 Updating Templates...\n"));

	const manager = getTemplateManager();
	const result = await manager.updateCache();

	if (result.updated > 0) {
		console.log(chalk.green(`✓ Updated ${result.updated} templates`));
	}

	if (result.errors.length > 0) {
		console.log(chalk.yellow(`\n⚠️  ${result.errors.length} errors occurred:`));
		for (const error of result.errors) {
			console.log(chalk.gray(`  - ${error}`));
		}
	}

	if (result.updated === 0 && result.errors.length === 0) {
		console.log(chalk.yellow("No templates were updated. Check your network connection."));
	}

	console.log();
}

/**
 * Clear template cache
 */
async function clearCache(): Promise<void> {
	console.log(chalk.cyan("\n🗑️  Clearing Template Cache...\n"));

	const manager = getTemplateManager();
	const stats = manager.getCacheStats();

	manager.clearCache();

	console.log(chalk.green(`✓ Cleared ${stats.files} cached templates`));
	console.log(chalk.gray(`  Freed ${(stats.totalSize / 1024).toFixed(2)} KB`));
	console.log();
}

/**
 * Show template info
 */
async function showTemplateInfo(category?: string, platform?: string): Promise<void> {
	if (!category) {
		console.log(chalk.red("Please specify a category and platform."));
		console.log(chalk.gray("Example: expressots templates info cicd github"));
		return;
	}

	console.log(chalk.cyan(`\n📄 Template Info: ${category}${platform ? `/${platform}` : ""}\n`));

	const manager = getTemplateManager();
	const manifest = await manager.getManifest();

	if (!manifest) {
		console.log(chalk.yellow("No manifest available. Run 'expressots templates update' first."));
		return;
	}

	const categoryTemplates = manifest.templates[category as keyof typeof manifest.templates];
	if (!categoryTemplates) {
		console.log(chalk.red(`Category '${category}' not found.`));
		return;
	}

	if (platform) {
		const platformTemplates = (categoryTemplates as Record<string, unknown>)[platform];
		if (!platformTemplates) {
			console.log(chalk.red(`Platform '${platform}' not found in category '${category}'.`));
			return;
		}

		console.log(chalk.bold(`${category}/${platform}:`));
		for (const [variant, info] of Object.entries(platformTemplates as Record<string, { path: string; version: string }>)) {
			console.log(`  ${chalk.yellow(variant)}:`);
			console.log(`    Path:    ${info.path}`);
			console.log(`    Version: ${info.version}`);
		}
	} else {
		console.log(chalk.bold(`${category}:`));
		for (const [key, value] of Object.entries(categoryTemplates)) {
			console.log(`  ${chalk.yellow(key)}`);
		}
	}

	console.log();
}

/**
 * Manage template repository
 */
async function manageRepository(args: string[]): Promise<void> {
	const configManager = getConfigManager();
	const subAction = args[0];

	if (!subAction) {
		const config = configManager.getTemplateConfig();
		console.log(chalk.cyan("\n📦 Template Repository Configuration\n"));
		console.log(`  Repository: ${chalk.yellow(config.repository)}`);
		console.log(`  Branch:     ${chalk.cyan(config.branch)}`);
		console.log(`  Cache TTL:  ${config.cacheTTL} seconds`);
		console.log();
		console.log(chalk.gray("Use 'expressots templates repo set <url>' to change."));
		console.log(chalk.gray("Use 'expressots templates repo reset' to restore defaults."));
		return;
	}

	switch (subAction) {
		case "set": {
			const repository = args[1];
			const branch = args[2];

			if (!repository) {
				console.log(chalk.red("Please specify a repository URL."));
				console.log(chalk.gray("Example: expressots templates repo set https://github.com/myorg/templates"));
				return;
			}

			configManager.setTemplateRepository(repository, branch);
			
			// Clear cache when repository changes
			const manager = getTemplateManager();
			manager.clearCache();
			manager.setRepository(repository, branch);

			console.log(chalk.green(`\n✓ Template repository set to: ${repository}`));
			if (branch) {
				console.log(chalk.green(`  Branch: ${branch}`));
			}
			console.log(chalk.gray("\nRun 'expressots templates update' to fetch templates from the new repository."));
			break;
		}

		case "reset": {
			configManager.resetTemplateRepository();
			
			const manager = getTemplateManager();
			manager.clearCache();
			manager.setRepository("expressots/templates", "main");

			console.log(chalk.green("\n✓ Template repository reset to default (expressots/templates)"));
			break;
		}

		default:
			console.log(chalk.red(`Unknown repository action: ${subAction}`));
			console.log(chalk.gray("Use 'set' or 'reset'."));
	}
}

/**
 * Show template system status
 */
async function showStatus(): Promise<void> {
	const manager = getTemplateManager();
	await manager.printStatus();
}

export { templatesCommand };
