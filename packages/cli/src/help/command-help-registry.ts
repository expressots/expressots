import {
	type CommandHelpSpec,
	helpEntry as o,
	printCommandHelp,
} from "./command-help";

/**
 * Structured help specs for the subcommands whose option-heavy `--help` would
 * otherwise render as yargs' sprawling default table. Keeping them here lets
 * the central interceptor in `cli.ts` render a refined, grouped screen that
 * matches the rest of the CLI without touching each command's yargs builder.
 *
 * NOTE: these mirror the option definitions in each command's `cli.ts`. When
 * an option/choice/default changes there, update the matching entry here.
 */
const SPECS: CommandHelpSpec[] = [
	{
		name: "costs",
		aliases: ["cost", "pricing"],
		usage: "expressots costs <action> [options]",
		description: "Estimate and compare cloud deployment costs.",
		groups: [
			{
				title: "Actions",
				entries: [
					o("estimate", "Estimate cost for a provider/service"),
					o("compare", "Compare costs across providers"),
					o("optimize", "Suggest cost optimizations"),
					o("pricing", "Show current pricing data"),
					o("update", "Refresh pricing data from remote"),
					o("info", "Show pricing system status & providers"),
				],
			},
			{
				title: "Options",
				entries: [
					o(
						"-p, --provider",
						"Cloud provider",
						"aws, gcp, azure, railway, render, fly, digitalocean, heroku",
					),
					o(
						"-s, --service",
						"Service type",
						"ecs, eks, lambda, cloudrun, gke, aci, aks, web-service",
					),
					o("-i, --instances", "Instances / replicas", "default: 1"),
					o("-c, --cpu", "vCPUs per instance", "default: 1"),
					o("-m, --memory", "Memory (GB) per instance", "default: 1"),
					o("--storage", "Storage in GB", "default: 10"),
					o("--bandwidth", "Bandwidth GB/month", "default: 100"),
					o("-r, --region", "Cloud region", "default: us-east-1"),
					o("--hours", "Running hours/month", "default: 720"),
					o(
						"--format",
						"Output format",
						"text, json, markdown · default: text",
					),
					o("-o, --output", "Write output to a file"),
				],
			},
		],
	},
	{
		name: "cicd",
		aliases: ["ci", "pipeline"],
		usage: "expressots cicd <action> [platform] [options]",
		description: "Generate and manage CI/CD pipeline configurations.",
		groups: [
			{
				title: "Actions",
				entries: [
					o("init", "Interactive pipeline setup"),
					o("generate", "Generate pipeline configuration"),
					o("list", "List supported platforms"),
					o("validate", "Validate existing pipelines"),
				],
			},
			{
				title: "Arguments",
				entries: [
					o(
						"platform",
						"CI/CD platform",
						"github, gitlab, circleci, jenkins, bitbucket, azure, all",
					),
				],
			},
			{
				title: "Options",
				entries: [
					o(
						"-s, --strategy",
						"Pipeline strategy",
						"basic, comprehensive, security-focused · default: comprehensive",
					),
					o(
						"--include-security",
						"Security scanning (Trivy, Snyk)",
						"default: true",
					),
					o("--include-e2e", "End-to-end tests", "default: false"),
					o(
						"--include-coverage",
						"Coverage reporting",
						"default: true",
					),
					o(
						"-r, --docker-registry",
						"Docker registry URL",
						"e.g. ghcr.io, docker.io",
					),
					o(
						"--deploy-target",
						"Deploy target",
						"kubernetes, ecs, cloudrun, railway, render, fly, none · default: none",
					),
					o("-b, --branch", "Trigger branch", "default: main"),
					o("--node-version", "Node.js version", "default: 20"),
					o("-o, --output-dir", "Output directory"),
				],
			},
		],
	},
	{
		name: "migrate",
		aliases: ["migration", "mig"],
		usage: "expressots migrate <action> [options]",
		description: "Generate migration scripts between cloud platforms.",
		groups: [
			{
				title: "Actions",
				entries: [
					o("init", "Interactive migration setup"),
					o("generate", "Generate migration scripts"),
					o("list", "List supported platforms"),
					o("analyze", "Analyze a migration path"),
				],
			},
			{
				title: "Options",
				entries: [
					o(
						"-f, --from",
						"Source platform",
						"heroku, docker-compose, vercel, aws-ecs, gcp-cloudrun, azure-container",
					),
					o(
						"-t, --to",
						"Target platform",
						"railway, render, fly, kubernetes, aws-ecs, gcp-cloudrun, azure-container",
					),
					o(
						"--include-data",
						"Include data migration",
						"default: false",
					),
					o(
						"--include-secrets",
						"Include secrets/env migration",
						"default: true",
					),
					o(
						"--dry-run",
						"Preview without writing files",
						"default: false",
					),
					o(
						"-o, --output-dir",
						"Output directory",
						"default: ./migration",
					),
				],
			},
		],
	},
	{
		name: "profile",
		aliases: ["prof", "analyze"],
		usage: "expressots profile <action> [target] [options]",
		description: "Analyze and optimize container configurations.",
		groups: [
			{
				title: "Actions",
				entries: [
					o("container", "Analyze a container configuration"),
					o("image", "Analyze a Docker image"),
					o("optimize", "Suggest Dockerfile optimizations"),
					o("report", "Show the latest profile report"),
				],
			},
			{
				title: "Arguments",
				entries: [o("target", "Dockerfile path or image name")],
			},
			{
				title: "Options",
				entries: [
					o(
						"-f, --dockerfile",
						"Path to Dockerfile",
						"default: Dockerfile",
					),
					o(
						"--format",
						"Output format",
						"text, json, html · default: text",
					),
					o(
						"--severity",
						"Minimum severity",
						"low, medium, high, critical · default: low",
					),
					o(
						"--auto-fix",
						"Apply safe optimizations",
						"default: false",
					),
					o("-o, --output", "Output file for report"),
					o(
						"--include-security",
						"Security vulnerability scan",
						"default: true",
					),
					o("--include-size", "Size analysis", "default: true"),
				],
			},
		],
	},
	{
		name: "containerize",
		aliases: ["ctr"],
		usage: "expressots containerize [target] [environment] [options]",
		description:
			"Generate container configurations for your ExpressoTS application.",
		groups: [
			{
				title: "Arguments",
				entries: [
					o(
						"target",
						"Target platform",
						"docker, kubernetes, k8s, compose · default: docker",
					),
					o(
						"environment",
						"Target environment",
						"development, staging, production, all · default: production",
					),
				],
			},
			{
				title: "Options",
				entries: [
					o(
						"--preset",
						"Container preset",
						"minimal, secure, fast-startup, dev, multi-arch, standard · default: standard",
					),
					o(
						"--analyze",
						"Analyze project before generating",
						"default: true",
					),
					o(
						"--skip-compose",
						"Skip docker-compose.yml",
						"default: false",
					),
					o(
						"--include-ci",
						"Include CI/CD pipeline",
						"default: false",
					),
					o(
						"--ci-platform",
						"CI/CD platform",
						"github, gitlab, circleci, jenkins, bitbucket, azure, all · default: github",
					),
					o(
						"--ci-strategy",
						"CI/CD strategy",
						"basic, comprehensive, security-focused · default: comprehensive",
					),
					o(
						"--include-security-scans",
						"Security scanning (Trivy, Snyk)",
						"default: true",
					),
					o(
						"--include-e2e",
						"End-to-end tests in CI",
						"default: false",
					),
				],
			},
		],
	},
	{
		name: "container-dev",
		aliases: ["cdev", "docker-dev"],
		usage: "expressots container-dev [action] [options]",
		description: "Develop inside Docker containers with hot reload.",
		groups: [
			{
				title: "Actions",
				entries: [
					o("start", "Start the dev container (default)"),
					o("stop", "Stop the dev container"),
					o("attach", "Attach to the running container"),
					o("shell", "Open a shell in the container"),
					o("status", "Show container status"),
					o("logs", "Show container logs"),
				],
			},
			{
				title: "Options",
				entries: [
					o(
						"-c, --container",
						"Run dev inside Docker",
						"default: false",
					),
					o("-s, --service", "Compose service name", "default: app"),
					o(
						"-f, --compose-file",
						"docker-compose file",
						"default: docker-compose.development.yml",
					),
					o(
						"-b, --build",
						"Rebuild before starting",
						"default: false",
					),
					o("-d, --detach", "Run in background", "default: false"),
					o("-p, --port", "Override application port"),
					o("--debug-port", "Node inspector port", "default: 9229"),
					o(
						"-w, --watch",
						"File watching / hot reload",
						"default: true",
					),
					o("--follow", "Follow logs (logs action)", "default: true"),
					o("--tail", "Log lines to show", "default: 100"),
				],
			},
		],
	},
	{
		name: "templates",
		aliases: ["tpl"],
		usage: "expressots templates <action> [args...] [options]",
		description: "Manage CLI templates for CI/CD, Docker, and Kubernetes.",
		groups: [
			{
				title: "Actions",
				entries: [
					o("list", "List available templates"),
					o("update", "Update template cache from remote"),
					o("clear", "Clear local template cache"),
					o(
						"info",
						"Show template info (info <category> <platform>)",
					),
					o("repo", "View / set / reset template repository"),
					o("status", "Show template system status"),
				],
			},
			{
				title: "Options",
				entries: [
					o(
						"-c, --category",
						"Filter by category",
						"cicd, docker, kubernetes, migrations",
					),
					o(
						"-p, --platform",
						"Filter by platform",
						"github, gitlab, ...",
					),
				],
			},
		],
		notes: [
			"Examples:",
			"  expressots templates list",
			"  expressots templates info cicd github",
			"  expressots templates repo set https://github.com/org/templates",
		],
	},
	{
		name: "dev",
		usage: "expressots dev [options]",
		description: "Start the development server.",
		groups: [
			{
				title: "Options",
				entries: [
					o(
						"-c, --container",
						"Run dev inside Docker",
						"default: false",
					),
					o(
						"-b, --build",
						"Rebuild container before starting",
						"with --container",
					),
					o(
						"-d, --detach",
						"Run container in background",
						"with --container",
					),
				],
			},
		],
	},
];

/**
 * Index every spec by its canonical name and aliases for O(1) lookup.
 */
const SPEC_INDEX: Map<string, CommandHelpSpec> = (() => {
	const index = new Map<string, CommandHelpSpec>();
	for (const spec of SPECS) {
		index.set(spec.name, spec);
		for (const alias of spec.aliases ?? []) {
			index.set(alias, spec);
		}
	}
	return index;
})();

/**
 * Resolve a command token (name or alias) to its help spec, if any.
 */
export function resolveCommandHelpSpec(
	token: string,
): CommandHelpSpec | undefined {
	return SPEC_INDEX.get(token);
}

/**
 * Detect a `<command> --help` / `<command> -h` invocation and, if the command
 * has a registered spec, render the refined help screen.
 *
 * @returns `true` when custom help was printed (caller should exit), else `false`.
 */
export function tryPrintCommandHelp(args: string[], version?: string): boolean {
	const command = args[0];
	if (!command || command.startsWith("-")) {
		return false;
	}

	const wantsHelp = args
		.slice(1)
		.some((arg) => arg === "--help" || arg === "-h");
	if (!wantsHelp) {
		return false;
	}

	const spec = resolveCommandHelpSpec(command);
	if (!spec) {
		return false;
	}

	printCommandHelp(spec, version);
	return true;
}

export { SPECS as COMMAND_HELP_SPECS };
