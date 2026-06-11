import chalk from "chalk";
import { stdout } from "process";
import { type HelpGroup, renderHelpGroups } from "./render";

/**
 * The full command + schematics reference. Shares the exact visual
 * language of the top-level help screen (see `main-help.ts`) via the
 * common `renderHelpGroups` helper, but goes deeper: it enumerates every
 * `generate` schematic and provider sub-command.
 */
const RESOURCE_GROUPS: HelpGroup[] = [
	{
		title: "Project",
		entries: [
			{
				name: "new",
				desc: "Generate a new project (application or micro)",
			},
			{ name: "dev", desc: "Start the development server" },
			{ name: "build", desc: "Build the project for production" },
			{ name: "prod", desc: "Run in production mode" },
			{ name: "info", alias: "i", desc: "Display project information" },
			{ name: "scripts", desc: "Run scripts list or specific scripts" },
			{ name: "help", alias: "h", desc: "Show command help" },
		],
	},
	{
		title: "Generate",
		entries: [
			{
				name: "service",
				alias: "g s",
				desc: "Service [controller, usecase, dto, module]",
			},
			{ name: "controller", alias: "g c", desc: "Controller" },
			{ name: "usecase", alias: "g u", desc: "Use case" },
			{ name: "dto", alias: "g d", desc: "DTO" },
			{ name: "entity", alias: "g e", desc: "Entity" },
			{ name: "module", alias: "g mo", desc: "Module" },
			{ name: "middleware", alias: "g mi", desc: "Middleware" },
			{
				name: "interceptor",
				alias: "g i",
				desc: "Interceptor (--priority)",
			},
			{ name: "event", alias: "g ev", desc: "Type-safe event" },
			{
				name: "handler",
				alias: "g h",
				desc: "Event handler (--event, --priority)",
			},
			{ name: "guard", alias: "g gu", desc: "Authorization guard" },
			{ name: "config", alias: "g cfg", desc: "Config module" },
		],
	},
	{
		title: "Providers",
		entries: [
			{
				name: "provider",
				alias: "g p",
				desc: "Generate internal provider",
			},
			{
				name: "add",
				desc: "Add provider to the project (-d for devDependency)",
			},
			{ name: "remove", desc: "Remove provider from the project" },
			{ name: "create", desc: "Create external provider" },
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
			{ name: "resources", alias: "r", desc: "Show this reference" },
			{ name: "completion", desc: "Generate a shell completion script" },
		],
	},
];

const helpForm = async (): Promise<void> => {
	const lines: string[] = [
		"",
		`${chalk.bold.green("🐎 ExpressoTS CLI")}  ${chalk.dim(
			"·  Command Reference",
		)}`,
		...renderHelpGroups(RESOURCE_GROUPS),
		"",
		`📝  ${chalk.dim("Docs:")} ${chalk.green(
			"https://doc.expresso-ts.com/docs/category/cli",
		)}`,
		"",
	];

	stdout.write(`${lines.join("\n")}\n`);
};

export { helpForm };
