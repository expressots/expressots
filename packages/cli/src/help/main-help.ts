import chalk from "chalk";
import { stdout } from "process";
import { type HelpGroup, renderHelpGroups } from "./render";

const COMMAND_GROUPS: HelpGroup[] = [
	{
		title: "Project",
		entries: [
			{ name: "new", desc: "Create a new application or micro project" },
			{ name: "dev", desc: "Start the development server" },
			{ name: "build", desc: "Build the project for production" },
			{ name: "prod", desc: "Run in production mode" },
			{ name: "info", alias: "i", desc: "Display project information" },
			{ name: "scripts", desc: "Run one or more package scripts" },
		],
	},
	{
		title: "Generate",
		entries: [
			{
				name: "generate",
				alias: "g",
				desc: "Scaffold a resource (controller, usecase, dto, ...)",
			},
		],
	},
	{
		title: "Providers",
		entries: [
			{ name: "create", desc: "Create an external provider" },
			{ name: "add", desc: "Add a provider to the project" },
			{ name: "remove", desc: "Remove a provider from the project" },
		],
	},
	{
		title: "DevOps",
		entries: [
			{
				name: "containerize",
				alias: "ctr",
				desc: "Generate Docker / Kubernetes / Compose configs",
			},
			{
				name: "cicd",
				alias: "ci",
				desc: "Generate and manage CI/CD pipelines",
			},
			{
				name: "migrate",
				alias: "mig",
				desc: "Generate migration scripts between platforms",
			},
			{
				name: "profile",
				alias: "prof",
				desc: "Analyze and optimize container configs",
			},
			{
				name: "container-dev",
				alias: "cdev",
				desc: "Develop inside Docker with hot reload",
			},
			{
				name: "costs",
				alias: "cost",
				desc: "Estimate and compare cloud deployment costs",
			},
			{
				name: "templates",
				alias: "tpl",
				desc: "Manage CI/CD, Docker, and Kubernetes templates",
			},
		],
	},
	{
		title: "Studio & Help",
		entries: [
			{ name: "studio", desc: "Launch ExpressoTS Studio" },
			{
				name: "openapi",
				desc: "Generate an OpenAPI 3.1 spec from your project",
			},
			{
				name: "resources",
				alias: "r",
				desc: "Show full command & schematics reference",
			},
			{ name: "completion", desc: "Generate a shell completion script" },
		],
	},
	{
		title: "Options",
		entries: [
			{ name: "-h, --help", desc: "Show help" },
			{ name: "-V, --version", desc: "Show version" },
		],
	},
];

/**
 * Print a refined, grouped, column-aligned top-level help screen.
 *
 * Unlike the default yargs help, this drops the repeated `expressots`
 * prefix on every line and renders aliases inline, keeping the whole
 * reference compact while still listing every command.
 */
export function printMainHelp(version?: string): void {
	const title = version
		? `🐎 ExpressoTS CLI v${version}`
		: "🐎 ExpressoTS CLI";

	const lines: string[] = [
		"",
		chalk.bold.green(title),
		"",
		`${chalk.bold("Usage:")} expressots <command> [options]`,
		...renderHelpGroups(COMMAND_GROUPS),
		"",
		chalk.dim(
			"Run 'expressots <command> --help' for details on a command.",
		),
		"",
		`🌐  ${chalk.green("https://expresso-ts.com")}     ` +
			`💖  ${chalk.green("https://github.com/sponsors/expressots")}`,
		"",
	];

	stdout.write(`${lines.join("\n")}\n`);
}
