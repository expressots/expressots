import fs from "fs";
import path from "path";
import chalk from "chalk";
import type { ProjectAnalysis } from "../analyzers/project-analyzer";
import { getPresetConfig } from "../presets/preset-registry";
import {
	loadDockerTemplate,
	buildDockerVars,
	logTemplateSource,
} from "./template-loader";

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

	console.log(
		chalk.yellow(
			`📝 Generating Dockerfile${options.environment !== "all" ? `.${options.environment}` : "s"}...`,
		),
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
		const templateType =
			env === "production" ? "production" : "development";
		const vars = buildDockerVars(analysis, entryPoint);

		// Try remote template, fall back to embedded
		const result = await loadDockerTemplate(templateType, vars, () =>
			generateDockerfileContent(env, preset, analysis, entryPoint),
		);

		logTemplateSource(`Dockerfile.${env}`, result.source);

		const filename =
			env === "production" ? "Dockerfile" : `Dockerfile.${env}`;
		const filepath = path.join(cwd, filename);

		fs.writeFileSync(filepath, result.content, "utf-8");
		console.log(chalk.green(`  ✓ Created ${filename}`));
	}

	// Generate .dockerignore
	const dockerignore = generateDockerignoreContent(analysis);
	fs.writeFileSync(path.join(cwd, ".dockerignore"), dockerignore, "utf-8");
	console.log(chalk.green(`  ✓ Created .dockerignore`));

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
		console.log(
			chalk.green(`  ✓ Created docker-setup.js (for local dependencies)`),
		);

		// Also update package.json with docker:setup script
		updatePackageJsonWithDockerScript(cwd);
		console.log(
			chalk.green(`  ✓ Updated package.json with docker:setup script`),
		);

		console.log(
			chalk.yellow(
				`\n⚠️  Note: .docker-deps/ and package.docker.json are temporary solutions`,
			),
		);
		console.log(
			chalk.yellow(
				`   for local file dependencies. Once packages are published to npm,`,
			),
		);
		console.log(
			chalk.yellow(
				`   you can remove these and use a simpler Dockerfile.\n`,
			),
		);
	}
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

	if (environment === "development") {
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
		? generateLocalDependencyCopies(analysis!.localDependencyPaths)
		: "";

	// Package file handling - use package.docker.json for local deps
	const packageCopySection = hasLocalDeps
		? `# Copy package files (use Docker-modified version for local dependencies)
COPY package.docker.json ./package.json`
		: `# Copy package files
COPY package*.json ./`;

	// Install command - use npm install for local deps (npm ci can't resolve local paths)
	const installCommand = hasLocalDeps
		? `# Install dependencies (using npm install for local file dependencies)
RUN npm install`
		: getInstallCommand(packageManager, false);

	return `# Development Dockerfile
# Generated by ExpressoTS CLI${hasLocalDeps ? "\n# Note: This project uses local file dependencies" : ""}

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

# Expose port and debug port
EXPOSE ${port}
EXPOSE 9229

# Set environment
ENV NODE_ENV=development
ENV PORT=${port}

# Start with hot reload
CMD ["npm", "run", "dev"]
`;
}

function generateProductionDockerfile(
	nodeVersion: string,
	packageManager: string,
	port: number,
	preset: any,
	analysis: ProjectAnalysis | undefined,
	entryPoint: string,
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
		);
	}

	// Generate local dependency copy commands (only if using local file: deps)
	const localDepCopies = hasLocalDeps
		? generateLocalDependencyCopies(analysis!.localDependencyPaths)
		: "";

	// Package file handling - only use package.docker.json for local deps
	const packageCopySection = hasLocalDeps
		? `# Copy package files (use Docker-modified version for local dependencies)
COPY package.docker.json ./package.json
COPY package-lock.json* ./`
		: `# Copy package files
COPY package*.json ./
COPY package-lock.json* ./`;

	// Skip npm prune for local dependencies as package-lock.json paths won't resolve
	const pruneCommand = hasLocalDeps
		? `# Skip npm prune for local file dependencies (paths in package-lock.json are from host)
# Once packages are published to npm, you can add: RUN npm prune --production`
		: `# Prune devDependencies after build
RUN npm prune --production`;

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
${getInstallCommand(packageManager, false)}

# Copy source code
COPY . .

# Build application
RUN npm run build

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
ENV NODE_ENV=production
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
): string {
	const hasLocalDeps = analysis?.hasLocalDependencies ?? false;
	const localDepCopies = hasLocalDeps
		? generateLocalDependencyCopies(analysis!.localDependencyPaths)
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
${getInstallCommand(packageManager, true)}

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE ${port}

# Set environment
ENV NODE_ENV=production
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

function generateLocalDependencyCopies(localDependencyPaths: string[]): string {
	if (!localDependencyPaths || localDependencyPaths.length === 0) {
		return "";
	}

	// Generate COPY commands for local dependencies
	// We need to copy them to a local location that's within the build context
	return (
		`
# Copy local dependencies (these should be in the project directory)
# Run the setup script first: npm run docker:setup` +
		"\n" +
		localDependencyPaths
			.map((depPath) => {
				const filename = path.basename(depPath);
				return `COPY ./.docker-deps/${filename} ./.docker-deps/${filename}`;
			})
			.join("\n")
	);
}

function generateDockerignoreContent(analysis?: ProjectAnalysis): string {
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

# Environment files
.env
.env.*
!.env.example

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

// Update file: paths to use .docker-deps
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

if (pkg.dependencies) {
  Object.keys(pkg.dependencies).forEach(key => {
    if (pkg.dependencies[key].startsWith('file:')) {
      const filename = pkg.dependencies[key].split('/').pop();
      pkg.dependencies[key] = 'file:.docker-deps/' + filename;
    }
  });
}

if (pkg.devDependencies) {
  Object.keys(pkg.devDependencies).forEach(key => {
    if (pkg.devDependencies[key].startsWith('file:')) {
      const filename = pkg.devDependencies[key].split('/').pop();
      pkg.devDependencies[key] = 'file:.docker-deps/' + filename;
    }
  });
}

fs.writeFileSync('package.docker.json', JSON.stringify(pkg, null, 2) + '\\n', 'utf-8');

console.log('✅ Local dependencies setup complete!');
console.log('   You can now run: docker build -t myapp .');
`;
}

function updatePackageJsonWithDockerScript(cwd: string): void {
	const packageJsonPath = path.join(cwd, "package.json");
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}

	// Use node script for cross-platform compatibility
	// Use project name from package.json for image name
	const imageName =
		packageJson.name?.replace(/[^a-z0-9-]/gi, "-").toLowerCase() ||
		"expressots-app";
	packageJson.scripts["docker:setup"] = "node docker-setup.js";
	packageJson.scripts["docker:build"] =
		`npm run docker:setup && docker build -t ${imageName} .`;
	packageJson.scripts["docker:run"] = `docker run -p 3000:3000 ${imageName}`;

	fs.writeFileSync(
		packageJsonPath,
		JSON.stringify(packageJson, null, 2) + "\n",
		"utf-8",
	);
}
