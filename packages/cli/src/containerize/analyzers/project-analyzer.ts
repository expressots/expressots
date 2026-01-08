import fs from "fs";
import path from "path";
import Compiler from "../../utils/compiler";
import {
	analyzeBootstrapConfig,
	type BootstrapConfig,
} from "./bootstrap-analyzer";

export interface ProjectAnalysis {
	nodeVersion: string;
	packageManager: "npm" | "pnpm" | "yarn" | "bun";
	dependencies: string[];
	devDependencies: string[];
	controllers: string[];
	hasDatabase: boolean;
	hasRedis: boolean;
	hasCors: boolean;
	estimatedMemory: string;
	estimatedCpu: string;
	healthCheckPaths: string[];
	port: number;
	hasLocalDependencies: boolean;
	localDependencyPaths: string[];
	/** Bootstrap configuration analysis */
	bootstrapConfig: BootstrapConfig;
}

export async function analyzeProject(): Promise<ProjectAnalysis> {
	const cwd = process.cwd();
	const packageJsonPath = path.join(cwd, "package.json");

	if (!fs.existsSync(packageJsonPath)) {
		throw new Error("package.json not found in current directory");
	}

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

	// Detect Node version
	const nodeVersion =
		packageJson.engines?.node || process.version.replace("v", "");

	// Detect package manager
	const packageManager = detectPackageManager(cwd);

	// Get dependencies
	const dependencies = Object.keys(packageJson.dependencies || {});
	const devDependencies = Object.keys(packageJson.devDependencies || {});

	// Detect local file dependencies
	const allDeps = {
		...packageJson.dependencies,
		...packageJson.devDependencies,
	};
	const localDependencyPaths: string[] = [];
	let hasLocalDependencies = false;

	for (const [name, version] of Object.entries(allDeps)) {
		if (typeof version === "string" && version.startsWith("file:")) {
			hasLocalDependencies = true;
			const relativePath = version.replace("file:", "");
			localDependencyPaths.push(relativePath);
		}
	}

	// Detect database
	const hasDatabase = dependencies.some(
		(dep) =>
			dep.includes("pg") ||
			dep.includes("mysql") ||
			dep.includes("mongodb") ||
			dep.includes("prisma") ||
			dep.includes("typeorm"),
	);

	// Detect Redis
	const hasRedis = dependencies.some(
		(dep) => dep.includes("redis") || dep.includes("ioredis"),
	);

	// Detect CORS
	const hasCors = dependencies.some((dep) => dep.includes("cors"));

	// Find controllers
	const controllers = await findControllers(cwd);

	// Detect health check paths
	const healthCheckPaths = await detectHealthCheckPaths(cwd);

	// Estimate resources
	const estimatedMemory = estimateMemoryUsage(dependencies);
	const estimatedCpu = "250m"; // Default conservative estimate

	// Detect port
	const port = await detectPort(cwd);

	// Analyze bootstrap configuration
	const bootstrapConfig = await analyzeBootstrapConfig();

	return {
		nodeVersion,
		packageManager,
		dependencies,
		devDependencies,
		controllers,
		hasDatabase,
		hasRedis,
		hasCors,
		estimatedMemory,
		estimatedCpu,
		healthCheckPaths,
		port,
		hasLocalDependencies,
		localDependencyPaths,
		bootstrapConfig,
	};
}

function detectPackageManager(cwd: string): "npm" | "pnpm" | "yarn" | "bun" {
	if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
	if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
	if (fs.existsSync(path.join(cwd, "bun.lockb"))) return "bun";
	return "npm";
}

async function findControllers(cwd: string): Promise<string[]> {
	const controllers: string[] = [];
	const srcDir = path.join(cwd, "src");

	if (!fs.existsSync(srcDir)) {
		return controllers;
	}

	const findControllersRecursive = (dir: string) => {
		const files = fs.readdirSync(dir);

		for (const file of files) {
			const fullPath = path.join(dir, file);
			const stat = fs.statSync(fullPath);

			if (stat.isDirectory()) {
				findControllersRecursive(fullPath);
			} else if (file.endsWith(".controller.ts")) {
				controllers.push(fullPath);
			}
		}
	};

	findControllersRecursive(srcDir);
	return controllers;
}

async function detectHealthCheckPaths(cwd: string): Promise<string[]> {
	const paths: string[] = [];
	const controllers = await findControllers(cwd);

	for (const controller of controllers) {
		const content = fs.readFileSync(controller, "utf-8");

		// Look for common health check patterns
		if (content.includes("/health") || content.includes("health")) {
			paths.push("/health");
		}
		if (content.includes("/ready") || content.includes("readiness")) {
			paths.push("/ready");
		}
		if (content.includes("/live") || content.includes("liveness")) {
			paths.push("/live");
		}
	}

	// Remove duplicates
	return [...new Set(paths)];
}

async function detectPort(cwd: string): Promise<number> {
	try {
		const config = await Compiler.loadConfig();
		// Check for port in config
		// Default to 3000
		return 3000;
	} catch {
		return 3000;
	}
}

function estimateMemoryUsage(dependencies: string[]): string {
	// Basic estimation based on dependency count
	const depCount = dependencies.length;

	if (depCount < 10) return "128Mi";
	if (depCount < 30) return "256Mi";
	if (depCount < 50) return "512Mi";
	return "1Gi";
}
