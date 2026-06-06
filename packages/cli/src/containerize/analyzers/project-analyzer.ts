import fs from "fs";
import path from "path";
import { globSync } from "glob";
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
	/** True when Yarn Berry (v2+) is detected via `.yarnrc.yml` */
	yarnBerry: boolean;
	/** True when a `pnpm-workspace.yaml` file is present */
	hasPnpmWorkspace: boolean;
	/**
	 * True when the project is a monorepo: a `pnpm-workspace.yaml` is
	 * present (pnpm) or the root `package.json` declares a `workspaces`
	 * field (npm/yarn/bun).
	 */
	hasWorkspaces: boolean;
	/**
	 * Relative directories of each workspace package that has its own
	 * `package.json`, resolved from the workspace globs. Used to copy
	 * per-workspace manifests into the image before a frozen install so
	 * the dependency graph resolves in a monorepo build.
	 */
	workspacePackagePaths: string[];
	/** Which Bun lockfile was found, if any */
	bunLockfileType?: "text" | "binary";
	/**
	 * True when any dependency ships a native C/C++ addon that requires
	 * a compilation toolchain (python3, make, g++) during `npm install`.
	 * Used to inject `apk add` build tools into Alpine-based builder
	 * stages so node-gyp can compile from source.
	 */
	hasNativeDependencies: boolean;
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

	// Detect Node version as a Docker-tag-safe major version. `engines.node`
	// is often a semver range (`>=20`, `^20.0.0`, `20.x`) which is NOT a
	// valid Docker tag, so we extract the major version. Falls back to the
	// CLI host's major version when `engines.node` is absent.
	const nodeVersion = resolveNodeMajor(packageJson.engines?.node);

	// Detect package manager and related toolchain metadata
	const packageManager = detectPackageManager(cwd);
	const yarnBerry =
		packageManager === "yarn" &&
		fs.existsSync(path.join(cwd, ".yarnrc.yml"));
	const hasPnpmWorkspace = fs.existsSync(
		path.join(cwd, "pnpm-workspace.yaml"),
	);
	const workspacePackagePaths = detectWorkspacePackages(
		cwd,
		packageManager,
		packageJson,
	);
	const hasWorkspaces =
		hasPnpmWorkspace ||
		workspacePackagePaths.length > 0 ||
		hasWorkspacesField(packageJson);
	const bunLockfileType = detectBunLockfileType(cwd);

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

	// Detect native addons that need a C/C++ toolchain to compile
	const allDepNames = [...dependencies, ...devDependencies];
	const hasNativeDependencies = detectNativeDependencies(allDepNames, cwd);

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
		yarnBerry,
		hasPnpmWorkspace,
		hasWorkspaces,
		workspacePackagePaths,
		bunLockfileType,
		hasNativeDependencies,
		bootstrapConfig,
	};
}

/**
 * Resolve a Docker-tag-safe Node major version from an `engines.node`
 * value. The official `node` images are tagged by major (e.g. `node:22`,
 * `node:22-alpine`), but `engines.node` is frequently a semver range
 * (`>=20`, `^20.0.0`, `20 || 22`) that is not a valid Docker tag.
 *
 * We take the first numeric run as the major version. When no value is
 * provided, fall back to the CLI host's major version, and ultimately to
 * a sensible LTS default. Examples:
 *   ">=20"    -> "20"
 *   "^20.0.0" -> "20"
 *   "24.3.0"  -> "24"
 *   "20.x"    -> "20"
 *   undefined -> host major (e.g. "22")
 */
export function resolveNodeMajor(enginesNode?: string): string {
	const hostMajor = process.version.replace(/^v/, "").split(".")[0];
	if (!enginesNode || typeof enginesNode !== "string") {
		return hostMajor || "22";
	}
	const match = enginesNode.match(/\d+/);
	return match ? match[0] : hostMajor || "22";
}

/**
 * Well-known packages that ship native C/C++ addons compiled via
 * node-gyp (or similar). On Alpine-based images these need
 * `python3 make g++` to build from source. This list does not need
 * to be exhaustive; it covers the most common packages that fail in
 * minimal Docker images.
 */
const NATIVE_ADDON_PACKAGES = new Set([
	"better-sqlite3",
	"bcrypt",
	"sharp",
	"canvas",
	"node-sass",
	"sqlite3",
	"libxmljs",
	"libxmljs2",
	"cpu-features",
	"microtime",
	"fsevents",
	"sodium-native",
	"argon2",
	"unix-dgram",
	"bufferutil",
	"utf-8-validate",
	"re2",
	"farmhash",
	"leveldown",
]);

function detectNativeDependencies(depNames: string[], cwd: string): boolean {
	// Check direct dependencies first (fast path).
	if (depNames.some((dep) => NATIVE_ADDON_PACKAGES.has(dep))) {
		return true;
	}

	// Also check installed node_modules for known native addons that may
	// be transitive dependencies (e.g. better-sqlite3 pulled in by
	// @expressots/studio-agent).
	const nodeModules = path.join(cwd, "node_modules");
	if (!fs.existsSync(nodeModules)) return false;

	for (const pkg of NATIVE_ADDON_PACKAGES) {
		if (
			fs.existsSync(path.join(nodeModules, pkg, "binding.gyp")) ||
			fs.existsSync(path.join(nodeModules, pkg, "package.json"))
		) {
			return true;
		}
	}

	return false;
}

/** Reads the `workspaces` field (array or `{ packages: [] }`) from a
 * parsed package.json into a flat list of glob patterns. */
function getWorkspaceGlobs(packageJson: {
	workspaces?: string[] | { packages?: string[] };
}): string[] {
	const ws = packageJson.workspaces;
	if (!ws) return [];
	if (Array.isArray(ws)) return ws;
	if (Array.isArray(ws.packages)) return ws.packages;
	return [];
}

function hasWorkspacesField(packageJson: {
	workspaces?: string[] | { packages?: string[] };
}): boolean {
	return getWorkspaceGlobs(packageJson).length > 0;
}

/** Minimal parser for the `packages:` list in `pnpm-workspace.yaml`. */
function parsePnpmWorkspaceGlobs(cwd: string): string[] {
	const file = path.join(cwd, "pnpm-workspace.yaml");
	if (!fs.existsSync(file)) return [];
	const globs: string[] = [];
	let inPackages = false;
	for (const rawLine of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
		const line = rawLine.replace(/#.*$/, "");
		if (/^packages:\s*$/.test(line)) {
			inPackages = true;
			continue;
		}
		// A new top-level key ends the packages block.
		if (inPackages && /^\S/.test(line)) break;
		const match = inPackages && line.match(/^\s*-\s*["']?([^"'\s]+)["']?/);
		if (match) globs.push(match[1]);
	}
	return globs;
}

/**
 * Expands the workspace globs into the set of directories that contain
 * a `package.json`, returned as POSIX-style relative paths. Negation
 * patterns (`!pkg`) and `node_modules` are excluded.
 */
function detectWorkspacePackages(
	cwd: string,
	packageManager: string,
	packageJson: { workspaces?: string[] | { packages?: string[] } },
): string[] {
	const globs =
		packageManager === "pnpm"
			? parsePnpmWorkspaceGlobs(cwd)
			: getWorkspaceGlobs(packageJson);

	if (globs.length === 0) return [];

	const dirs = new Set<string>();
	for (const pattern of globs) {
		if (pattern.startsWith("!")) continue;
		// Match a `package.json` directly under each globbed directory.
		const manifestGlob = `${pattern.replace(/\/+$/, "")}/package.json`;
		const matches = globSync(manifestGlob, {
			cwd,
			ignore: "**/node_modules/**",
			posix: true,
		});
		for (const manifest of matches) {
			dirs.add(path.posix.dirname(manifest));
		}
	}

	return [...dirs].sort();
}

function detectPackageManager(cwd: string): "npm" | "pnpm" | "yarn" | "bun" {
	if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
	if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
	// Bun v1.2+ defaults to the text-based `bun.lock`; older projects use
	// the binary `bun.lockb`. Either one indicates a Bun project.
	if (
		fs.existsSync(path.join(cwd, "bun.lock")) ||
		fs.existsSync(path.join(cwd, "bun.lockb"))
	) {
		return "bun";
	}
	return "npm";
}

/**
 * Returns which Bun lockfile is present, preferring the text-based
 * `bun.lock` (default since Bun v1.2) over the legacy binary
 * `bun.lockb` when both exist.
 */
function detectBunLockfileType(cwd: string): "text" | "binary" | undefined {
	if (fs.existsSync(path.join(cwd, "bun.lock"))) return "text";
	if (fs.existsSync(path.join(cwd, "bun.lockb"))) return "binary";
	return undefined;
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
