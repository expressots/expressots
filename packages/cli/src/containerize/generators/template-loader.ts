/**
 * Template loader for containerize generators
 * Handles remote template fetching with fallback to embedded templates
 */

import { getTemplateManager, type RenderOptions } from "../../templates";
import type { ProjectAnalysis } from "../analyzers/project-analyzer";

export interface DockerTemplateVars {
	nodeVersion: string;
	packageManager: string;
	entryPoint: string;
	port: number;
	hasLocalDeps: boolean;
	healthCheckEndpoint: string;
	projectName: string;
	installCommand: string;
	buildCommand: string;
	/** Production-only dependency reduction command (bare, no `RUN`). */
	pruneCommand: string;
	/** Full CMD array for the dev hot-reload entry, e.g. `["npm", "run", "dev"]`. */
	devCmd: string;
	/** COPY instruction(s) for the lockfile and PM config files. */
	lockfileCopy: string;
	/** Setup line(s) to make the PM available (Corepack / Bun install). */
	pmSetup: string;
	/** `apk`/`apt-get` line(s) for native addon compilation tools (node-gyp). */
	nativeDepsSetup: string;
	/** Base image for the builder stage (oven/bun for Bun, else Node). */
	builderImage: string;
	/** Base image for the runtime stage (always Node, since CMD is `node`). */
	runtimeImage: string;
	/** Value for `ENV NODE_ENV` (supports staging, not just production). */
	nodeEnv: string;
	/** Distro-aware RUN line that creates the non-root `nodejs` user. */
	nonRootUserSetup: string;
}

/**
 * Options that let `buildDockerVars` compute preset- and
 * environment-aware values (base images, NODE_ENV) for remote templates.
 */
export interface BuildDockerVarsOptions {
	packageManager?: string;
	preset?: { baseImage?: string; baseVariant?: "alpine" | "debian" };
	environment?: string;
}

export interface TemplateResult {
	content: string;
	source: "remote" | "embedded";
}

/**
 * Load Docker template with fallback
 */
export async function loadDockerTemplate(
	templateType: string,
	variables: DockerTemplateVars,
	embeddedGenerator: () => string,
): Promise<TemplateResult> {
	const manager = getTemplateManager();

	try {
		// Try to fetch from remote template repository
		const result = await manager.fetchDockerTemplate(templateType);

		if (result.data) {
			// Template found, render with variables
			const renderOptions: RenderOptions = {
				variables: {
					...variables,
				},
				conditionals: {
					hasLocalDeps: variables.hasLocalDeps,
					useNpmCi: !variables.hasLocalDeps,
				},
			};

			const rendered = manager.render(result.data, renderOptions);
			return { content: rendered, source: "remote" };
		}
	} catch {
		// Remote fetch failed, fall back to embedded
	}

	// Fall back to embedded template generator
	return {
		content: embeddedGenerator(),
		source: "embedded",
	};
}

/**
 * Load Kubernetes template with fallback
 */
export async function loadKubernetesTemplate(
	templateType: string,
	variables: Record<string, unknown>,
	embeddedGenerator: () => string,
): Promise<TemplateResult> {
	const manager = getTemplateManager();

	try {
		// Try to fetch from remote template repository
		const result = await manager.fetchKubernetesTemplate(templateType);

		if (result.data) {
			// Template found, render with variables
			const renderOptions: RenderOptions = {
				variables: variables as Record<
					string,
					string | number | boolean | undefined
				>,
			};

			const rendered = manager.render(result.data, renderOptions);
			return { content: rendered, source: "remote" };
		}
	} catch {
		// Remote fetch failed, fall back to embedded
	}

	// Fall back to embedded template generator
	return {
		content: embeddedGenerator(),
		source: "embedded",
	};
}

/**
 * Build Docker template variables from analysis.
 *
 * The package manager is taken from the project analysis (falling back
 * to the explicit `packageManager` argument and then npm), so remote
 * templates receive the same PM-specific commands as the embedded
 * generator.
 */
export function buildDockerVars(
	analysis: ProjectAnalysis | undefined,
	entryPoint: string,
	options: BuildDockerVarsOptions | string = {},
): DockerTemplateVars {
	// Back-compat: a bare string used to mean `packageManager`.
	const opts: BuildDockerVarsOptions =
		typeof options === "string" ? { packageManager: options } : options;

	const pm = analysis?.packageManager ?? opts.packageManager ?? "npm";
	const yarnBerry = analysis?.yarnBerry ?? false;
	const hasLocalDeps = analysis?.hasLocalDependencies || false;
	const nodeVersion = analysis?.nodeVersion || "22";
	const preset = opts.preset ?? {};

	// Runtime always uses a Node image (the CMD is `node dist/...`).
	// Bun projects build in the official oven/bun image so `bunx tsc`
	// works without installing Node/npm.
	const runtimeImage = resolveBaseImage(preset, nodeVersion);
	const builderImage = pm === "bun" ? "oven/bun:1-alpine" : runtimeImage;
	const builderIsAlpine = builderImage.includes("alpine");

	// Bun needs no PM setup (oven/bun ships Bun + bunx). Others may need
	// Corepack (pnpm / Yarn Berry).
	const pmSetup = pm === "bun" ? "" : getPackageManagerSetup(pm, yarnBerry);

	const environment = opts.environment ?? "production";

	return {
		nodeVersion,
		packageManager: pm,
		entryPoint,
		port: analysis?.port || 3000,
		hasLocalDeps,
		healthCheckEndpoint: analysis?.healthCheckPaths?.[0] || "/health",
		projectName: "expressots-app",
		installCommand: getInstallCommand(pm, hasLocalDeps, yarnBerry),
		buildCommand: getBuildCommand(pm),
		pruneCommand: getPruneCommand(pm, yarnBerry),
		devCmd: getDevCmd(pm),
		lockfileCopy: hasLocalDeps ? "" : getLockfileCopy(pm, analysis),
		pmSetup,
		nativeDepsSetup: getNativeDepsSetup(
			analysis?.hasNativeDependencies ?? false,
			builderIsAlpine,
		),
		builderImage,
		runtimeImage,
		nodeEnv: environment === "development" ? "development" : environment,
		nonRootUserSetup: getNonRootUserSetup(runtimeImage.includes("alpine")),
	};
}

/**
 * Distro-aware non-root user creation. Alpine uses BusyBox
 * `adduser`/`addgroup`; Debian uses `useradd`/`groupadd`.
 */
function getNonRootUserSetup(isAlpine: boolean): string {
	if (isAlpine) {
		return `RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001`;
	}
	return `RUN groupadd -g 1001 nodejs && \\
    useradd -m -u 1001 -g nodejs nodejs`;
}

/**
 * Resolve a preset's base image (mirrors the embedded generator). An
 * explicit `baseImage` wins; otherwise combine the distro variant with
 * the Node major version.
 */
function resolveBaseImage(
	preset: { baseImage?: string; baseVariant?: "alpine" | "debian" },
	nodeVersion: string,
): string {
	if (preset.baseImage) return preset.baseImage;
	const variant = preset.baseVariant ?? "alpine";
	return variant === "debian"
		? `node:${nodeVersion}`
		: `node:${nodeVersion}-alpine`;
}

/**
 * Distro-aware native addon toolchain install (node-gyp). Mirrors the
 * embedded generator: Alpine uses `apk`, Debian uses `apt-get`.
 */
function getNativeDepsSetup(
	hasNativeDependencies: boolean,
	isAlpine: boolean,
): string {
	if (!hasNativeDependencies) return "";
	const comment = "# Install build tools for native addons (node-gyp)";
	if (isAlpine) {
		return `${comment}\nRUN apk add --no-cache python3 make g++`;
	}
	return (
		`${comment}\n` +
		"RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*"
	);
}

/**
 * Get install command for package manager (bare, used as `RUN {{installCommand}}`).
 */
function getInstallCommand(
	packageManager: string,
	hasLocalDeps?: boolean,
	yarnBerry: boolean = false,
): string {
	if (hasLocalDeps) {
		// Lockfile-based installs can't resolve host `file:` paths, so
		// drop to the loose install for whichever PM is in use.
		switch (packageManager) {
			case "pnpm":
				return "pnpm install --no-frozen-lockfile";
			case "yarn":
				return yarnBerry
					? "yarn install --no-immutable"
					: "yarn install";
			case "bun":
				return "bun install --no-save";
			default:
				return "npm install";
		}
	}

	switch (packageManager) {
		case "pnpm":
			return "pnpm install --frozen-lockfile";
		case "yarn":
			return yarnBerry
				? "yarn install --immutable"
				: "yarn install --frozen-lockfile";
		case "bun":
			return "bun install --frozen-lockfile";
		default:
			return "npm ci";
	}
}

/**
 * Get build command for package manager (bare, used as `RUN {{buildCommand}}`).
 */
function getBuildCommand(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm run build";
		case "yarn":
			return "yarn build";
		case "bun":
			return "bun run build";
		default:
			return "npm run build";
	}
}

/**
 * Get production-only prune command (bare, used as `RUN {{pruneCommand}}`).
 */
function getPruneCommand(
	packageManager: string,
	yarnBerry: boolean = false,
): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm install --prod --frozen-lockfile";
		case "yarn":
			return yarnBerry
				? "yarn workspaces focus --production --all"
				: "yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline";
		case "bun":
			return "bun install --frozen-lockfile --production";
		default:
			return "npm ci --omit=dev";
	}
}

/**
 * Get the dev hot-reload CMD array (used as `CMD {{devCmd}}`).
 */
function getDevCmd(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return `["pnpm", "run", "dev"]`;
		case "yarn":
			return `["yarn", "dev"]`;
		case "bun":
			return `["bun", "run", "dev"]`;
		default:
			return `["npm", "run", "dev"]`;
	}
}

/**
 * Get the COPY instruction(s) for the lockfile and PM config files.
 */
function getLockfileCopy(
	packageManager: string,
	analysis?: ProjectAnalysis,
): string {
	let lines: string[];
	switch (packageManager) {
		case "pnpm": {
			lines = ["COPY pnpm-lock.yaml ./"];
			if (analysis?.hasPnpmWorkspace) {
				lines.push("COPY pnpm-workspace.yaml ./");
			}
			break;
		}
		case "yarn": {
			lines = ["COPY yarn.lock ./"];
			if (analysis?.yarnBerry) {
				lines.push("COPY .yarnrc.yml ./");
				lines.push("COPY .yarn/ ./.yarn/");
			}
			break;
		}
		case "bun":
			lines = ["COPY bun.lock* ./"];
			break;
		default:
			lines = ["COPY package-lock.json* ./"];
			break;
	}

	// Copy each workspace package's manifest (monorepo support) so a
	// frozen install can resolve the full dependency graph.
	if (analysis?.workspacePackagePaths?.length) {
		for (const dir of analysis.workspacePackagePaths) {
			const normalized = dir.replace(/^\.\//, "").replace(/\/+$/, "");
			lines.push(`COPY ${normalized}/package.json ./${normalized}/`);
		}
	}

	return lines.join("\n");
}

/**
 * Get the setup line(s) required to make the PM available in the image.
 * The official Node images only bundle npm and Yarn Classic.
 */
function getPackageManagerSetup(
	packageManager: string,
	yarnBerry: boolean = false,
): string {
	switch (packageManager) {
		case "pnpm":
			return "# Enable pnpm via Corepack (bundled with Node)\nRUN corepack enable && corepack prepare pnpm@latest --activate";
		case "yarn":
			return yarnBerry
				? "# Enable Yarn Berry via Corepack (bundled with Node)\nRUN corepack enable"
				: "";
		case "bun":
			return "# Install Bun (the Node base image does not ship Bun).\n# Tip: for Bun-first projects, use the official oven/bun image as the base.\nRUN npm install -g bun";
		default:
			return "";
	}
}

/**
 * Log template source for debugging
 */
export function logTemplateSource(
	templateName: string,
	source: "remote" | "embedded",
): void {
	if (process.env.EXPRESSOTS_DEBUG) {
		const sourceLabel =
			source === "remote" ? "remote template" : "embedded template";
		console.log(`  [DEBUG] ${templateName}: Using ${sourceLabel}`);
	}
}
