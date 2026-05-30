import fs from "fs";
import path from "path";
import { stdout } from "process";
import chalk from "chalk";
import type { ProjectAnalysis } from "../analyzers/project-analyzer";
import { getPresetConfig } from "../presets/preset-registry";
import {
	loadDockerTemplate,
	buildDockerVars,
	logTemplateSource,
} from "./template-loader";
import {
	printBullet,
	printSection,
	printWarning,
} from "../../utils/cli-ui";
import {
	shouldCopyEnvFiles,
	getEnvFileForEnvironment,
} from "../analyzers/bootstrap-analyzer";

type GeneratorOptions = {
	environment: string;
	preset: string;
	[key: string]: any;
};

/**
 * Detects the entry point path by reading tsconfig.build.json
 * Returns the path relative to /app in the container
 */
function detectEntryPoint(cwd: string): string {
	// Try to read tsconfig.build.json first, then tsconfig.json
	const tsconfigPaths = [
		path.join(cwd, "tsconfig.build.json"),
		path.join(cwd, "tsconfig.json"),
	];

	for (const tsconfigPath of tsconfigPaths) {
		if (fs.existsSync(tsconfigPath)) {
			try {
				// Read and parse tsconfig (handle comments by stripping them)
				const content = fs.readFileSync(tsconfigPath, "utf-8");
				// Simple JSON parse (tsconfig may have comments, so we strip them)
				const cleanContent = content
					.replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
					.replace(/\/\/.*/g, ""); // Remove line comments

				const tsconfig = JSON.parse(cleanContent);
				const outDir = tsconfig.compilerOptions?.outDir || "./dist";
				const rootDir = tsconfig.compilerOptions?.rootDir || "./";

				// Determine the entry point based on rootDir
				// If rootDir is "." or "./" (project root), output will be dist/src/main.js
				// If rootDir is "./src" or "src", output will be dist/main.js
				const normalizedRootDir = rootDir
					.replace(/^\.\//, "")
					.replace(/\/$/, "");
				const normalizedOutDir = outDir
					.replace(/^\.\//, "")
					.replace(/\/$/, "");

				if (normalizedRootDir === "" || normalizedRootDir === ".") {
					// rootDir is project root, so src/ folder is preserved
					return `${normalizedOutDir}/src/main.js`;
				} else if (normalizedRootDir === "src") {
					// rootDir is src/, so main.js is directly in outDir
					return `${normalizedOutDir}/main.js`;
				} else {
					// Custom rootDir, assume src structure is preserved
					return `${normalizedOutDir}/src/main.js`;
				}
			} catch (err) {
				// Failed to parse, continue to fallback
			}
		}
	}

	// Default fallback for ExpressoTS projects
	return "dist/src/main.js";
}

export async function generateDockerfiles(
	options: GeneratorOptions,
	analysis?: ProjectAnalysis,
): Promise<void> {
	const cwd = process.cwd();
	const preset = getPresetConfig(options.preset);
	const entryPoint = detectEntryPoint(cwd);

	printSection(
		`📝 Generating Dockerfile${options.environment !== "all" ? `.${options.environment}` : "s"}`,
	);

	// Always generate production Dockerfile (as "Dockerfile")
	// Plus environment-specific if requested
	const environments =
		options.environment === "all"
			? ["development", "production"]
			: options.environment === "development"
				? ["development", "production"] // Also generate production Dockerfile
				: [options.environment];

	for (const env of environments) {
		// `staging` is a production-like environment (multi-stage
		// build, prune dev deps, no source-mount expected) but with a
		// distinct `NODE_ENV`, so it picks the production template.
		// Anything not explicitly production-like falls through to dev.
		const templateType = isProductionLikeEnv(env)
			? "production"
			: "development";
		const vars = buildDockerVars(analysis, entryPoint);

		const result = await loadDockerTemplate(templateType, vars, () =>
			generateDockerfileContent(env, preset, analysis, entryPoint),
		);

		logTemplateSource(`Dockerfile.${env}`, result.source);

		const filename =
			env === "production" ? "Dockerfile" : `Dockerfile.${env}`;
		const filepath = path.join(cwd, filename);

		fs.writeFileSync(filepath, result.content, "utf-8");
		printBullet(chalk.green(`✓ Created ${filename}`));
	}

	// Generate .dockerignore
	const dockerignore = generateDockerignoreContent(analysis);
	fs.writeFileSync(path.join(cwd, ".dockerignore"), dockerignore, "utf-8");
	printBullet(chalk.green(`✓ Created .dockerignore`));

	// Generate helper script for local dependencies ONLY if needed
	// This is a temporary solution for unpublished packages
	if (analysis?.hasLocalDependencies) {
		const setupScriptNode = generateDockerSetupScriptNode(
			analysis.localDependencyPaths,
		);
		fs.writeFileSync(
			path.join(cwd, "docker-setup.js"),
			setupScriptNode,
			"utf-8",
		);
		printBullet(
			chalk.green(`✓ Created docker-setup.js (for local dependencies)`),
		);

		// Also update package.json with docker:setup script using the
		// detected package manager so the generated `docker:build`
		// composite script works for pnpm/yarn/bun users too.
		updatePackageJsonWithDockerScript(
			cwd,
			analysis?.packageManager ?? "npm",
		);
		printBullet(
			chalk.green(`✓ Updated package.json with docker:setup script`),
		);

		stdout.write("\n");
		printWarning(
			".docker-deps/ and package.docker.json are temporary solutions for local file dependencies. Once packages are published to npm, you can remove these and use a simpler Dockerfile.",
			"containerize",
		);
	}
}

/**
 * Production-like environments share the multi-stage / prune /
 * baked-image Dockerfile shape. The only thing that differs is
 * `NODE_ENV` (which apps may inspect for behavior switches).
 */
function isProductionLikeEnv(env: string): boolean {
	return env === "production" || env === "staging";
}

function generateDockerfileContent(
	environment: string,
	preset: any,
	analysis: ProjectAnalysis | undefined,
	entryPoint: string,
): string {
	const nodeVersion = analysis?.nodeVersion || "22";
	const packageManager = analysis?.packageManager || "npm";
	const port = analysis?.port || 3000;

	if (!isProductionLikeEnv(environment)) {
		return generateDevelopmentDockerfile(
			nodeVersion,
			packageManager,
			port,
			preset,
			analysis,
		);
	}

	return generateProductionDockerfile(
		nodeVersion,
		packageManager,
		port,
		preset,
		analysis,
		entryPoint,
		environment,
	);
}

function generateDevelopmentDockerfile(
	nodeVersion: string,
	packageManager: string,
	port: number,
	preset: any,
	analysis?: ProjectAnalysis,
): string {
	const baseImage = preset.baseImage || `node:${nodeVersion}-alpine`;
	const hasLocalDeps = analysis?.hasLocalDependencies ?? false;
	const localDepCopies = hasLocalDeps
		? generateLocalDependencyCopies(
				analysis!.localDependencyPaths,
				packageManager,
			)
		: "";

	// Bootstrap config analysis for env files
	const bootstrapConfig = analysis?.bootstrapConfig;
	const copyEnvFiles = bootstrapConfig && shouldCopyEnvFiles(bootstrapConfig);
	const envFileCopies = copyEnvFiles
		? generateEnvFileCopies(bootstrapConfig!, "development")
		: "";
	const envFileNote = copyEnvFiles
		? "\n# Note: Environment files are copied based on bootstrap configuration"
		: "";

	// Package file handling - use package.docker.json for local deps
	const packageCopySection = hasLocalDeps
		? `# Copy package files (use Docker-modified version for local dependencies)
COPY package.docker.json ./package.json`
		: `# Copy package files
COPY package*.json ./`;

	// Install command - lockfile-based installs can't resolve `file:`
	// paths recorded by the host, so for local deps we drop down to the
	// loose install for whichever PM is in use.
	const installCommand = hasLocalDeps
		? `# Install dependencies (lockfile-free install for local file dependencies)
${getLocalDepsInstallCommand(packageManager)}`
		: getInstallCommand(packageManager, false);

	return `# Development Dockerfile
# Generated by ExpressoTS CLI${hasLocalDeps ? "\n# Note: This project uses local file dependencies" : ""}${envFileNote}

FROM ${baseImage}

# Set working directory
WORKDIR /app

${packageCopySection}
${packageManager === "pnpm" ? "COPY pnpm-lock.yaml ./" : ""}
${packageManager === "yarn" ? "COPY yarn.lock ./" : ""}
${localDepCopies}

${installCommand}

# Copy source code
COPY . .
${envFileCopies}

# Expose port and debug port
EXPOSE ${port}
EXPOSE 9229

# Set environment
ENV NODE_ENV=development
ENV PORT=${port}

# Start with hot reload
${getCmdScript(packageManager, "dev")}
`;
}

/**
 * Generate COPY commands for environment files based on bootstrap config
 */
function generateEnvFileCopies(
	bootstrapConfig: import("../analyzers/bootstrap-analyzer").BootstrapConfig,
	environment: string,
): string {
	const copies: string[] = [];
	const envFile = getEnvFileForEnvironment(bootstrapConfig, environment);

	// Only copy files that exist
	if (bootstrapConfig.existingEnvFiles.includes(envFile)) {
		copies.push(`\n# Copy environment file for ${environment}`);
		copies.push(`COPY ${envFile} ./${envFile}`);
	}

	// Also copy .env if it exists (base configuration)
	if (
		bootstrapConfig.existingEnvFiles.includes(".env") &&
		envFile !== ".env"
	) {
		copies.push(`COPY .env ./.env`);
	}

	return copies.length > 0 ? copies.join("\n") : "";
}

function generateProductionDockerfile(
	nodeVersion: string,
	packageManager: string,
	port: number,
	preset: any,
	analysis: ProjectAnalysis | undefined,
	entryPoint: string,
	environment: string = "production",
): string {
	const baseImage = preset.baseImage || `node:${nodeVersion}-alpine`;
	const isMultiStage = preset.multiStage !== false;
	const hasLocalDeps = analysis?.hasLocalDependencies ?? false;

	if (!isMultiStage) {
		return generateSingleStageDockerfile(
			baseImage,
			packageManager,
			port,
			preset,
			analysis,
			entryPoint,
			environment,
		);
	}

	// Generate local dependency copy commands (only if using local file: deps)
	const localDepCopies = hasLocalDeps
		? generateLocalDependencyCopies(
				analysis!.localDependencyPaths,
				packageManager,
			)
		: "";

	// Package file handling - only use package.docker.json for local deps.
	// When local deps are present we deliberately do NOT copy the host
	// lockfile: it still references the original `file:` paths from the
	// host (e.g. `file:../expressots/...tgz`) which won't resolve inside
	// the container. npm install will recreate the lockfile from the
	// rewritten package.docker.json.
	const packageCopySection = hasLocalDeps
		? `# Copy package files (use Docker-modified version for local dependencies)
# Lockfile is intentionally omitted: the host lockfile references file:../
# paths that don't exist inside the container.
COPY package.docker.json ./package.json`
		: `# Copy package files
COPY package*.json ./
COPY package-lock.json* ./`;

	// Skip prune for local dependencies as lockfile paths won't resolve.
	// Otherwise use the package-manager-specific prune equivalent.
	const pruneCommand = hasLocalDeps
		? `# Skip prune for local file dependencies (lockfile paths are from host)
# Once packages are published, you can re-enable the prune step.`
		: `# Prune devDependencies after build
${getPruneCommand(packageManager)}`;

	// Multi-stage build (default for production)
	return `# Production Dockerfile (Multi-stage)
# Generated by ExpressoTS CLI
# Preset: ${preset.name}${hasLocalDeps ? "\n# Note: This project uses local file dependencies (temporary until published)" : ""}

# ============================================
# Stage 1: Builder
# ============================================
FROM ${baseImage} AS builder

WORKDIR /app
${localDepCopies}

${packageCopySection}
${packageManager === "pnpm" ? "COPY pnpm-lock.yaml ./" : ""}
${packageManager === "yarn" ? "COPY yarn.lock ./" : ""}

# Install ALL dependencies (including devDependencies for build)
${hasLocalDeps ? getLocalDepsInstallCommand(packageManager) : getInstallCommand(packageManager, false)}

# Copy source code
COPY . .

# Build application
${getRunScriptCommand(packageManager, "build")}

${pruneCommand}

${
	preset.security?.enabled
		? `
# ============================================
# Stage 2: Production
# ============================================
FROM ${baseImage}

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs
`
		: `
# ============================================
# Stage 2: Production
# ============================================
FROM ${baseImage}

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
`
}

# Expose port
EXPOSE ${port}

# Set environment variables
ENV NODE_ENV=${environment}
ENV PORT=${port}

${
	analysis?.hasDatabase
		? `# Database connection will be provided via environment variables
# Example: DATABASE_URL=postgresql://user:pass@host:5432/db
`
		: ""
}
${
	analysis?.hasRedis
		? `# Redis connection will be provided via environment variables
# Example: REDIS_URL=redis://host:6379
`
		: ""
}

${
	preset.healthCheck?.enabled
		? `# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \\
  CMD node -e "require('http').get('http://localhost:${port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
`
		: ""
}

# Start application
CMD ["node", "${entryPoint}"]
`;
}

function generateSingleStageDockerfile(
	baseImage: string,
	packageManager: string,
	port: number,
	preset: any,
	analysis: ProjectAnalysis | undefined,
	entryPoint: string,
	environment: string = "production",
): string {
	const hasLocalDeps = analysis?.hasLocalDependencies ?? false;
	const localDepCopies = hasLocalDeps
		? generateLocalDependencyCopies(
				analysis!.localDependencyPaths,
				packageManager,
			)
		: "";

	// Package file handling
	const packageCopySection = hasLocalDeps
		? `# Copy package files (use Docker-modified version for local dependencies)
COPY package.docker.json ./package.json`
		: `# Copy package files
COPY package*.json ./`;

	return `# Production Dockerfile (Single-stage)
# Generated by ExpressoTS CLI${hasLocalDeps ? "\n# Note: This project uses local file dependencies (temporary until published)" : ""}

FROM ${baseImage}

WORKDIR /app
${localDepCopies}

${packageCopySection}

# Install dependencies
${hasLocalDeps ? getLocalDepsInstallCommand(packageManager) : getInstallCommand(packageManager, true)}

# Copy source code
COPY . .

# Build application
${getRunScriptCommand(packageManager, "build")}

# Expose port
EXPOSE ${port}

# Set environment
ENV NODE_ENV=${environment}
ENV PORT=${port}

# Start application
CMD ["node", "${entryPoint}"]
`;
}

function getInstallCommand(
	packageManager: string,
	productionOnly: boolean,
): string {
	const prodFlag = productionOnly ? " --production" : "";

	switch (packageManager) {
		case "pnpm":
			return `RUN pnpm install${productionOnly ? " --prod" : ""}`;
		case "yarn":
			return `RUN yarn install${productionOnly ? " --production" : ""}`;
		case "bun":
			return `RUN bun install${productionOnly ? " --production" : ""}`;
		default:
			return `RUN npm ci${prodFlag}`;
	}
}

/**
 * Install dependencies in dev mode for a project that uses local
 * `file:` deps. We can't use the lockfile-based commands (`npm ci`,
 * `pnpm install --frozen-lockfile`) because the lockfile pins paths
 * from the host that don't exist inside the container, so we fall
 * back to the looser install command for whichever PM is detected.
 */
function getLocalDepsInstallCommand(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return `RUN pnpm install --no-frozen-lockfile`;
		case "yarn":
			return `RUN yarn install --no-immutable`;
		case "bun":
			return `RUN bun install --no-save`;
		default:
			return `RUN npm install`;
	}
}

/**
 * Returns the Dockerfile RUN command that runs an npm-style script
 * (e.g. `build`) using the detected package manager.
 */
function getRunScriptCommand(
	packageManager: string,
	scriptName: string,
): string {
	switch (packageManager) {
		case "pnpm":
			return `RUN pnpm run ${scriptName}`;
		case "yarn":
			return `RUN yarn ${scriptName}`;
		case "bun":
			return `RUN bun run ${scriptName}`;
		default:
			return `RUN npm run ${scriptName}`;
	}
}

/**
 * Returns the Dockerfile CMD instruction that runs an npm-style
 * script (e.g. `dev`) using the detected package manager.
 */
function getCmdScript(packageManager: string, scriptName: string): string {
	switch (packageManager) {
		case "pnpm":
			return `CMD ["pnpm", "run", "${scriptName}"]`;
		case "yarn":
			return `CMD ["yarn", "${scriptName}"]`;
		case "bun":
			return `CMD ["bun", "run", "${scriptName}"]`;
		default:
			return `CMD ["npm", "run", "${scriptName}"]`;
	}
}

/**
 * Returns the Dockerfile RUN command for pruning devDependencies in
 * a multi-stage build. Only npm and yarn ship a built-in prune; for
 * pnpm and bun we re-install with the production flag instead.
 */
function getPruneCommand(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return `RUN pnpm install --prod --no-frozen-lockfile`;
		case "yarn":
			return `RUN yarn install --production --ignore-scripts --prefer-offline`;
		case "bun":
			return `RUN bun install --production`;
		default:
			return `RUN npm prune --production`;
	}
}

function generateLocalDependencyCopies(
	localDependencyPaths: string[],
	packageManager: string = "npm",
): string {
	if (!localDependencyPaths || localDependencyPaths.length === 0) {
		return "";
	}

	const setupHint = getRunScriptShellInvocation(
		packageManager,
		"docker:setup",
	);

	return (
		`
# Copy local dependencies (these should be in the project directory)
# Run the setup script first: ${setupHint}` +
		"\n" +
		localDependencyPaths
			.map((depPath) => {
				const filename = path.basename(depPath);
				return `COPY ./.docker-deps/${filename} ./.docker-deps/${filename}`;
			})
			.join("\n")
	);
}

/**
 * Returns the shell invocation a developer would type to run an
 * npm-style script (used in informational comments / generated
 * package.json scripts, NOT inside Dockerfile RUN/CMD).
 */
function getRunScriptShellInvocation(
	packageManager: string,
	scriptName: string,
): string {
	switch (packageManager) {
		case "pnpm":
			return `pnpm run ${scriptName}`;
		case "yarn":
			return `yarn ${scriptName}`;
		case "bun":
			return `bun run ${scriptName}`;
		default:
			return `npm run ${scriptName}`;
	}
}

function generateDockerignoreContent(analysis?: ProjectAnalysis): string {
	// Bootstrap config determines which env files should NOT be ignored
	const bootstrapConfig = analysis?.bootstrapConfig;
	const copyEnvFiles = bootstrapConfig && shouldCopyEnvFiles(bootstrapConfig);

	// Build env file exclusions based on bootstrap config
	let envFileSection = `# Environment files
.env
.env.*
!.env.example`;

	if (copyEnvFiles && bootstrapConfig) {
		// Don't ignore env files that need to be copied
		const envExclusions = bootstrapConfig.existingEnvFiles
			.filter((f) => f !== ".env.example")
			.map((f) => `!${f}`)
			.join("\n");

		if (envExclusions) {
			envFileSection = `# Environment files (some included based on bootstrap config)
.env
.env.*
!.env.example
${envExclusions}`;
		}
	}

	return `# Generated by ExpressoTS CLI

# Dependencies
node_modules/
npm-debug.log
yarn-error.log
pnpm-debug.log
.pnpm-store/

# Build outputs
dist/
build/
*.tsbuildinfo

${envFileSection}

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Git
.git/
.gitignore

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore
docker-setup.js

# Documentation
README.md
docs/
*.md

# CI/CD
.github/
.gitlab-ci.yml
azure-pipelines.yml

# Misc
.editorconfig
.prettierrc
.eslintrc*
jest.config.*${analysis?.hasLocalDependencies ? "\n\n# Local dependencies (included via setup script)\n!.docker-deps/" : ""}
`;
}

function generateDockerSetupScriptNode(localDependencyPaths: string[]): string {
	return `#!/usr/bin/env node
// Docker setup script for local dependencies
// Generated by ExpressoTS CLI

const fs = require('fs');
const path = require('path');

console.log('📦 Setting up local dependencies for Docker build...');

// Create .docker-deps directory
const depsDir = '.docker-deps';
if (!fs.existsSync(depsDir)) {
  fs.mkdirSync(depsDir, { recursive: true });
}

// Copy local dependency files
${localDependencyPaths
	.map((depPath) => {
		const filename = path.basename(depPath);
		return `console.log('  Copying ${filename}...');
try {
  fs.copyFileSync('${depPath.replace(/\\/g, "/")}', path.join(depsDir, '${filename}'));
} catch (err) {
  console.error('  ❌ Failed to copy ${filename}:', err.message);
  process.exit(1);
}`;
	})
	.join("\n")}

console.log('  Creating Docker-compatible package.json...');

// Read the user's package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

// Track all rewritten file: deps so we can force npm to use the
// flattened .docker-deps/ paths for any TRANSITIVE references too.
// This is critical: published tarballs of local packages bake in
// their own \`file:../...\` paths (e.g. core's package.json depends
// on shared via \`file:../shared/...tgz\`). Without overrides, npm
// would try to resolve those original host paths from inside
// node_modules and fail with ENOENT in the container.
const overrides = {};

const rewriteFileDeps = (depGroup) => {
  if (!depGroup) return;
  Object.keys(depGroup).forEach((key) => {
    const value = depGroup[key];
    if (typeof value !== 'string' || !value.startsWith('file:')) return;
    const filename = value.split('/').pop();
    // Only rewrite tarball references; directory file: refs are
    // intentionally left as-is and will surface as a build failure
    // the user can address (publish or replace with a tarball).
    if (!filename.endsWith('.tgz')) return;
    const newPath = 'file:.docker-deps/' + filename;
    depGroup[key] = newPath;
    overrides[key] = newPath;
  });
};

rewriteFileDeps(pkg.dependencies);
rewriteFileDeps(pkg.devDependencies);

if (Object.keys(overrides).length > 0) {
  pkg.overrides = Object.assign({}, pkg.overrides || {}, overrides);
  console.log('  Added overrides for ' + Object.keys(overrides).length + ' transitive file: deps');
}

fs.writeFileSync('package.docker.json', JSON.stringify(pkg, null, 2) + '\\n', 'utf-8');

console.log('✅ Local dependencies setup complete!');
console.log('   You can now run: docker build -t myapp .');
`;
}

function updatePackageJsonWithDockerScript(
	cwd: string,
	packageManager: string = "npm",
): void {
	const packageJsonPath = path.join(cwd, "package.json");
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}

	const imageName =
		packageJson.name?.replace(/[^a-z0-9-]/gi, "-").toLowerCase() ||
		"expressots-app";
	const setupInvocation = getRunScriptShellInvocation(
		packageManager,
		"docker:setup",
	);
	packageJson.scripts["docker:setup"] = "node docker-setup.js";
	packageJson.scripts["docker:build"] =
		`${setupInvocation} && docker build -t ${imageName} .`;
	packageJson.scripts["docker:run"] = `docker run -p 3000:3000 ${imageName}`;

	fs.writeFileSync(
		packageJsonPath,
		JSON.stringify(packageJson, null, 2) + "\n",
		"utf-8",
	);
}
