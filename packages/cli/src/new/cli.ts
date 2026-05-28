import chalk from "chalk";
import { Argv, CommandModule } from "yargs";
import semver from "semver";
import { projectForm } from "./form";
import { printWarning } from "../utils/cli-ui";

type CommandModuleArgs = object;

export const PACKAGE_MANAGER_CHOICES = [
	"npm",
	"yarn",
	"pnpm",
	...(process.platform !== "win32" ? ["bun"] : []),
] as const;

export const TEMPLATE_CHOICES = ["application", "micro"] as const;

export const MIDDLEWARE_PRESET_CHOICES = [
	"api",
	"web",
	"graphql",
	"microservice",
	"minimal",
] as const;

const formatInlineChoices = (choices: readonly string[]): string =>
	choices.join(", ");

const NEW_COMMAND_EPILOG = [
	chalk.bold("Available choices"),
	"",
	chalk.bold("Templates") + ` (${formatInlineChoices(TEMPLATE_CHOICES)})`,
	"  application   Full REST/GraphQL API (DI, controllers, lifecycle, presets)",
	"  micro         Single-file HTTP service via micro(), no DI container",
	chalk.dim(
		"  Tip: add -e / --events with application to scaffold application-with-events",
	),
	"",
	chalk.bold("Package managers") +
		` (${formatInlineChoices(PACKAGE_MANAGER_CHOICES)})`,
	...(process.platform === "win32"
		? [chalk.dim("  bun is not available on Windows")]
		: []),
	"",
	chalk.bold("Middleware presets") +
		` (${formatInlineChoices(MIDDLEWARE_PRESET_CHOICES)})` +
		chalk.dim(" (application template only)"),
	"  api            REST API: security, compression, rate limit (default)",
	"  web            api + cookies and session",
	"  graphql        GraphQL stack + Apollo scaffold",
	"  microservice   Minimal parsing + compression",
	"  minimal        parse() only; wire the rest yourself",
	"",
	chalk.bold("Flags"),
	"  -e, --events   boolean: use application-with-events (not a separate -t value)",
	"",
	chalk.bold("Provider packages") +
		chalk.dim(" (not expressots new): expressots create --provider <name>"),
	"",
	chalk.bold("Silent vs interactive"),
	"  Pass -t and -p together for non-interactive scaffold (CI-friendly).",
	"  Omit both for prompts (template, package manager, preset, events).",
].join("\n");

const commandOptions = (yargs: Argv): Argv => {
	const terminalWidth =
		typeof process.stdout.columns === "number" && process.stdout.columns > 0
			? Math.max(process.stdout.columns, 100)
			: 120;

	return yargs
		.wrap(terminalWidth)
		.positional("project-name", {
			describe: "The name of the project",
			type: "string",
		})
		.option("template", {
			describe: "Project template",
			type: "string",
			choices: [...TEMPLATE_CHOICES],
			alias: "t",
		})
		.option("package-manager", {
			describe: "Package manager",
			type: "string",
			choices: [...PACKAGE_MANAGER_CHOICES],
			alias: "p",
		})
		.option("preset", {
			describe: "Middleware preset (application template only)",
			type: "string",
			choices: [...MIDDLEWARE_PRESET_CHOICES],
			alias: "s",
		})
		.option("events", {
			describe:
				"Scaffold application-with-events (boolean flag; do not pass a value)",
			type: "boolean",
			alias: "e",
		})
		.option("directory", {
			describe: "Parent directory for the new project",
			type: "string",
			alias: "d",
		})
		.implies("package-manager", "template")
		.implies("template", "package-manager")
		.implies("preset", "template")
		.implies("events", "template")
		.epilog(NEW_COMMAND_EPILOG);
};

const checkNodeVersion = (): void => {
	const minVersion = "20.0.0";
	const maxVersion = "24.0.0";
	const currentVersion = process.version;

	if (!semver.satisfies(currentVersion, `>=${minVersion} <=${maxVersion}`)) {
		const msg: string = `Node.js version [${chalk.bold(chalk.white(currentVersion))}] is not fully tested. Recommended: v20.x or v22.x LTS.`;
		printWarning(msg);
	}
};

const createProject = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "new <project-name> [package-manager] [template] [directory]",
		describe: "Create ExpressoTS application.",
		builder: commandOptions,
		handler: async ({
			projectName,
			packageManager,
			template,
			directory,
			preset,
			events,
		}) => {
			checkNodeVersion();
			return await projectForm(projectName, [
				packageManager,
				template,
				directory,
				preset,
				events,
			]);
		},
	};
};

export { createProject, NEW_COMMAND_EPILOG };
