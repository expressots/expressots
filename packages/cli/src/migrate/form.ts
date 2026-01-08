import fs from "fs";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import type { MigrationSource, MigrationTarget } from "./cli";
import { detectCurrentPlatform } from "./analyzers/platform-detector";
import {
	generateHerokuToRailway,
	generateHerokuToRender,
	generateHerokuToFly,
	generateComposeToK8s,
	generateComposeToRailway,
	generateComposeToRender,
	generateGenericMigration,
} from "./generators";

export interface MigrationOptions {
	from?: MigrationSource;
	to?: MigrationTarget;
	includeData: boolean;
	includeSecrets: boolean;
	dryRun: boolean;
	outputDir: string;
}

interface MigrationPath {
	from: MigrationSource;
	to: MigrationTarget;
	description: string;
	complexity: "low" | "medium" | "high";
}

const SUPPORTED_MIGRATIONS: MigrationPath[] = [
	{ from: "heroku", to: "railway", description: "Heroku to Railway", complexity: "low" },
	{ from: "heroku", to: "render", description: "Heroku to Render", complexity: "low" },
	{ from: "heroku", to: "fly", description: "Heroku to Fly.io", complexity: "medium" },
	{ from: "heroku", to: "kubernetes", description: "Heroku to Kubernetes", complexity: "high" },
	{ from: "docker-compose", to: "kubernetes", description: "Docker Compose to Kubernetes", complexity: "medium" },
	{ from: "docker-compose", to: "railway", description: "Docker Compose to Railway", complexity: "low" },
	{ from: "docker-compose", to: "render", description: "Docker Compose to Render", complexity: "low" },
	{ from: "docker-compose", to: "fly", description: "Docker Compose to Fly.io", complexity: "medium" },
	{ from: "vercel", to: "railway", description: "Vercel to Railway", complexity: "low" },
	{ from: "vercel", to: "render", description: "Vercel to Render", complexity: "low" },
	{ from: "aws-ecs", to: "gcp-cloudrun", description: "AWS ECS to GCP Cloud Run", complexity: "high" },
	{ from: "aws-ecs", to: "kubernetes", description: "AWS ECS to Kubernetes", complexity: "medium" },
	{ from: "gcp-cloudrun", to: "aws-ecs", description: "GCP Cloud Run to AWS ECS", complexity: "high" },
];

/**
 * Interactive migration setup wizard
 */
export async function initMigration(options: MigrationOptions): Promise<void> {
	console.log(chalk.cyan("\n🚀 ExpressoTS Migration Wizard\n"));

	// Detect current platform
	const detected = await detectCurrentPlatform();
	
	if (detected) {
		console.log(chalk.green(`✓ Detected current platform: ${detected}`));
	}

	// Interactive prompts
	const answers = await inquirer.prompt([
		{
			type: "list",
			name: "from",
			message: "Select source platform:",
			choices: [
				{ name: "Heroku", value: "heroku" },
				{ name: "Docker Compose", value: "docker-compose" },
				{ name: "Vercel", value: "vercel" },
				{ name: "AWS ECS", value: "aws-ecs" },
				{ name: "GCP Cloud Run", value: "gcp-cloudrun" },
				{ name: "Azure Container Apps", value: "azure-container" },
			],
			default: detected || "heroku",
		},
		{
			type: "list",
			name: "to",
			message: "Select target platform:",
			choices: (prev) => {
				const migrations = SUPPORTED_MIGRATIONS.filter(m => m.from === prev.from);
				if (migrations.length === 0) {
					// Show all targets if no specific migrations defined
					return [
						{ name: "Railway", value: "railway" },
						{ name: "Render", value: "render" },
						{ name: "Fly.io", value: "fly" },
						{ name: "Kubernetes", value: "kubernetes" },
						{ name: "AWS ECS", value: "aws-ecs" },
						{ name: "GCP Cloud Run", value: "gcp-cloudrun" },
					];
				}
				return migrations.map(m => ({
					name: `${m.to.charAt(0).toUpperCase() + m.to.slice(1)} (${m.complexity} complexity)`,
					value: m.to,
				}));
			},
		},
		{
			type: "confirm",
			name: "includeSecrets",
			message: "Include environment variable migration?",
			default: true,
		},
		{
			type: "confirm",
			name: "includeData",
			message: "Include data migration scripts?",
			default: false,
		},
		{
			type: "input",
			name: "outputDir",
			message: "Output directory for migration files:",
			default: "./migration",
		},
	]);

	const migrationOptions: MigrationOptions = {
		...options,
		from: answers.from,
		to: answers.to,
		includeSecrets: answers.includeSecrets,
		includeData: answers.includeData,
		outputDir: answers.outputDir,
	};

	await generateMigration(migrationOptions);
}

/**
 * Generate migration scripts
 */
export async function generateMigration(options: MigrationOptions): Promise<void> {
	if (!options.from || !options.to) {
		console.log(chalk.red("Error: Please specify both --from and --to platforms."));
		console.log(chalk.gray("Use 'expressots migrate list' to see available migrations."));
		return;
	}

	console.log(chalk.cyan(`\n📦 Generating migration: ${options.from} → ${options.to}\n`));

	// Create output directory
	const outputDir = path.resolve(options.outputDir);
	if (!options.dryRun) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Find migration path
	const migration = SUPPORTED_MIGRATIONS.find(
		m => m.from === options.from && m.to === options.to
	);

	if (options.dryRun) {
		console.log(chalk.yellow("🔍 Dry run mode - showing migration steps:\n"));
		printMigrationSteps(options, migration);
		return;
	}

	// Generate migration files based on source/target
	try {
		await generateMigrationFiles(options, outputDir, migration);
		
		console.log(chalk.green(`\n✅ Migration files generated in ${outputDir}\n`));
		printNextSteps(options);
	} catch (error) {
		console.log(chalk.red(`Error generating migration: ${error}`));
	}
}

/**
 * List available migrations
 */
export async function listMigrations(): Promise<void> {
	console.log(chalk.cyan("\n📋 Available Migration Paths\n"));

	// Group by source
	const bySource = SUPPORTED_MIGRATIONS.reduce((acc, m) => {
		if (!acc[m.from]) acc[m.from] = [];
		acc[m.from].push(m);
		return acc;
	}, {} as Record<string, MigrationPath[]>);

	for (const [source, migrations] of Object.entries(bySource)) {
		console.log(chalk.bold(`\nFrom ${source}:`));
		for (const m of migrations) {
			const complexityColor = m.complexity === "low" ? chalk.green :
				m.complexity === "medium" ? chalk.yellow : chalk.red;
			console.log(
				`  → ${m.to.padEnd(20)} ${complexityColor(`[${m.complexity}]`)}`
			);
		}
	}

	console.log(chalk.gray("\n\nUsage: expressots migrate generate --from <source> --to <target>"));
	console.log(chalk.gray("       expressots migrate init (interactive wizard)\n"));
}

/**
 * Analyze migration complexity
 */
export async function analyzeMigration(options: MigrationOptions): Promise<void> {
	console.log(chalk.cyan("\n🔍 Migration Analysis\n"));

	const detected = await detectCurrentPlatform();
	const cwd = process.cwd();

	console.log(chalk.bold("Current Setup:"));
	console.log(`  Platform: ${detected || "Unknown"}`);
	
	// Analyze project files
	const hasDockerfile = fs.existsSync(path.join(cwd, "Dockerfile"));
	const hasDockerCompose = fs.existsSync(path.join(cwd, "docker-compose.yml"));
	const hasK8s = fs.existsSync(path.join(cwd, "k8s"));
	const hasProcfile = fs.existsSync(path.join(cwd, "Procfile"));
	const hasVercelConfig = fs.existsSync(path.join(cwd, "vercel.json"));
	const hasRailwayConfig = fs.existsSync(path.join(cwd, "railway.json"));

	console.log(`  Dockerfile: ${hasDockerfile ? chalk.green("✓") : chalk.gray("✗")}`);
	console.log(`  Docker Compose: ${hasDockerCompose ? chalk.green("✓") : chalk.gray("✗")}`);
	console.log(`  Kubernetes: ${hasK8s ? chalk.green("✓") : chalk.gray("✗")}`);
	console.log(`  Procfile (Heroku): ${hasProcfile ? chalk.green("✓") : chalk.gray("✗")}`);
	console.log(`  Vercel Config: ${hasVercelConfig ? chalk.green("✓") : chalk.gray("✗")}`);
	console.log(`  Railway Config: ${hasRailwayConfig ? chalk.green("✓") : chalk.gray("✗")}`);

	// Check for environment variables
	const hasEnvFile = fs.existsSync(path.join(cwd, ".env"));
	const hasEnvExample = fs.existsSync(path.join(cwd, ".env.example"));
	
	console.log(chalk.bold("\nEnvironment:"));
	console.log(`  .env file: ${hasEnvFile ? chalk.green("✓") : chalk.gray("✗")}`);
	console.log(`  .env.example: ${hasEnvExample ? chalk.green("✓") : chalk.gray("✗")}`);

	// Analyze package.json for dependencies
	const packageJsonPath = path.join(cwd, "package.json");
	if (fs.existsSync(packageJsonPath)) {
		const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
		const deps = { ...pkg.dependencies, ...pkg.devDependencies };
		
		console.log(chalk.bold("\nDependencies:"));
		if (deps.pg || deps.postgres) console.log("  Database: PostgreSQL");
		if (deps.mysql || deps.mysql2) console.log("  Database: MySQL");
		if (deps.mongodb) console.log("  Database: MongoDB");
		if (deps.redis || deps.ioredis) console.log("  Cache: Redis");
	}

	if (options.to) {
		const migration = SUPPORTED_MIGRATIONS.find(
			m => m.from === (detected || options.from) && m.to === options.to
		);
		
		if (migration) {
			console.log(chalk.bold(`\nMigration to ${options.to}:`));
			console.log(`  Complexity: ${migration.complexity}`);
			console.log(`  Description: ${migration.description}`);
		}
	}

	console.log();
}

/**
 * Generate migration files based on source/target
 */
async function generateMigrationFiles(
	options: MigrationOptions,
	outputDir: string,
	migration?: MigrationPath
): Promise<void> {
	const { from, to } = options;

	// Generate based on migration path
	if (from === "heroku" && to === "railway") {
		await generateHerokuToRailway(outputDir, options);
	} else if (from === "heroku" && to === "render") {
		await generateHerokuToRender(outputDir, options);
	} else if (from === "heroku" && to === "fly") {
		await generateHerokuToFly(outputDir, options);
	} else if (from === "docker-compose" && to === "kubernetes") {
		await generateComposeToK8s(outputDir, options);
	} else if (from === "docker-compose" && to === "railway") {
		await generateComposeToRailway(outputDir, options);
	} else if (from === "docker-compose" && to === "render") {
		await generateComposeToRender(outputDir, options);
	} else {
		// Generic migration
		await generateGenericMigration(outputDir, options, migration);
	}
}

/**
 * Print migration steps for dry run
 */
function printMigrationSteps(options: MigrationOptions, migration?: MigrationPath): void {
	console.log(chalk.bold(`Migration: ${options.from} → ${options.to}`));
	console.log(`Complexity: ${migration?.complexity || "unknown"}`);
	console.log();
	
	console.log(chalk.bold("Steps:"));
	console.log("  1. Generate target platform configuration");
	console.log("  2. Create environment variable mapping");
	
	if (options.includeSecrets) {
		console.log("  3. Generate secrets migration script");
	}
	
	if (options.includeData) {
		console.log("  4. Generate data migration scripts");
	}
	
	console.log("  5. Create migration checklist (README.md)");
	console.log();
}

/**
 * Print next steps after migration
 */
function printNextSteps(options: MigrationOptions): void {
	console.log(chalk.bold("📖 Next Steps:"));
	console.log(`  1. Review the migration files in ${options.outputDir}`);
	console.log("  2. Check the MIGRATION_CHECKLIST.md for step-by-step instructions");
	console.log("  3. Set up environment variables on the target platform");
	
	if (options.includeData) {
		console.log("  4. Review and run data migration scripts carefully");
	}
	
	console.log("  5. Test the deployment in a staging environment first");
	console.log();
}
