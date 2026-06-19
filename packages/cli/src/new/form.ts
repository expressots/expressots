import chalk from "chalk";
import { Presets, SingleBar } from "cli-progress";
import degit from "degit";
import inquirer from "inquirer";
import fs from "node:fs";
import path from "node:path";
import { BUNDLE_VERSION } from "../cli";
import { centerText } from "../utils/center-text";
import { changePackageName } from "../utils/change-package-info";
import { printError } from "../utils/cli-ui";
import { isValidPackageManager } from "../utils/input-validation";
import { safeSpawn, safeSpawnSync } from "../utils/safe-spawn";
import { writePnpmAllowBuildsConfig } from "./pnpm-allow-builds";

/**
 * Install dependencies using the selected package manager
 */
async function packageManagerInstall({
	packageManager,
	directory,
	progressBar,
}: {
	packageManager: string;
	directory: string;
	progressBar: SingleBar;
}) {
	if (!isValidPackageManager(packageManager)) {
		throw new Error(`Invalid package manager: ${packageManager}`);
	}

	// npm's `--silent` swallows errors too (loglevel=silent), which
	// makes failures impossible to diagnose. `--loglevel=error` keeps
	// the install quiet on the happy path but lets real failures
	// stream to stderr so we can capture and surface them below.
	const args =
		packageManager === "npm"
			? ["install", "--loglevel=error"]
			: ["install", "--silent"];
	if (packageManager === "yarn") {
		args.push("--ignore-engines");
	}
	return new Promise((resolve, reject) => {
		// `safeSpawn` (cross-spawn) handles the Windows `.cmd` shim
		// resolution and properly escapes argv even when the shell is
		// involved on Windows. The `directory` value is only used as
		// cwd; it is never interpolated into a command string.
		const installProcess = safeSpawn(packageManager, args, {
			cwd: directory,
			timeout: 600000,
		});

		let progress = 50;
		let lastProgressUpdate = Date.now();
		const interval = setInterval(() => {
			const now = Date.now();
			if (progress < 88) {
				const increment = progress < 70 ? 3 : 1;
				progress = Math.min(progress + increment, 88);
				progressBar.update(progress, {
					doing: "Installing dependencies...",
				});
			} else if (now - lastProgressUpdate > 3000) {
				progressBar.update(progress, {
					doing: "Installing dependencies...",
				});
			}
		}, 1000);

		// Keep a rolling tail of stderr/stdout so we can surface a
		// meaningful diagnostic when the install exits non-zero (npm's
		// real error is otherwise hidden behind `--silent`).
		const diagnosticBuffer: string[] = [];
		const MAX_DIAGNOSTIC_LINES = 20;
		const recordDiagnostic = (chunk: string) => {
			for (const line of chunk.split(/\r?\n/)) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				diagnosticBuffer.push(trimmed);
				if (diagnosticBuffer.length > MAX_DIAGNOSTIC_LINES) {
					diagnosticBuffer.shift();
				}
			}
		};

		installProcess.stdout?.on("data", (data: Buffer) => {
			const output = data.toString();
			recordDiagnostic(output);
			const cleanedOutput = output.trim().replace(/\|\|.*$/g, "");
			const npmProgressMatch = cleanedOutput.match(
				/\[(\d+)\/(\d+)\] (?:npm )?([\w\s]+)\.{3}/,
			);

			if (npmProgressMatch) {
				const [, current, total, task] = npmProgressMatch;
				const npmProgress = (parseInt(current) / parseInt(total)) * 100;
				progress = Math.round(50 + npmProgress * 0.4);
				lastProgressUpdate = Date.now();
				progressBar.update(progress, { doing: task });
			} else if (cleanedOutput) {
				lastProgressUpdate = Date.now();
				progressBar.update(progress, { doing: cleanedOutput });
			}
		});

		installProcess.stderr?.on("data", (data: Buffer) => {
			const output = data.toString();
			recordDiagnostic(output);
			const cleanedOutput = output.trim().replace(/\|\|.*$/g, "");
			const npmProgressMatch = cleanedOutput.match(
				/\[(\d+)\/(\d+)\] (?:npm )?([\w\s]+)\.{3}/,
			);

			if (npmProgressMatch) {
				const [, current, total, task] = npmProgressMatch;
				const npmProgress = (parseInt(current) / parseInt(total)) * 100;
				progress = Math.round(50 + npmProgress * 0.4);
				lastProgressUpdate = Date.now();
				progressBar.update(progress, { doing: task });
			}
		});

		installProcess.on("error", (error) => {
			clearInterval(interval);
			progressBar.stop();
			reject(new Error(`Failed to start subprocess: ${error.message}`));
		});

		installProcess.on("close", (code) => {
			clearInterval(interval);
			if (code === 0) {
				progressBar.update(90, { doing: "Dependencies installed" });

				resolve("Installation Done!");
			} else {
				progressBar.stop();
				if (diagnosticBuffer.length > 0) {
					console.log("\n");
					console.log(
						chalk.bold.red(
							`${packageManager} install failed with exit code ${code}:`,
						),
					);
					for (const line of diagnosticBuffer) {
						console.log(chalk.gray(`  ${line}`));
					}
					console.log("");
				}
				reject(
					new Error(
						`${packageManager} install exited with code ${code}`,
					),
				);
			}
		});
	});
}

/**
 * Check if the package manager is installed
 */
async function checkIfPackageManagerExists(packageManager: string) {
	if (!isValidPackageManager(packageManager)) {
		printError("Package manager not found!", packageManager);
		process.exit(1);
	}

	const result = safeSpawnSync(packageManager, ["--version"], {
		stdio: "ignore",
	});

	if (result.error || result.status !== 0) {
		printError("Package manager not found!", packageManager);
		process.exit(1);
	}

	return true;
}

/**
 * Copy directory recursively (for local template testing)
 */
function copyDirectorySync(src: string, dest: string): void {
	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true });
	}

	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		// Skip node_modules and dist directories
		if (entry.name === "node_modules" || entry.name === "dist") {
			continue;
		}

		if (entry.isDirectory()) {
			copyDirectorySync(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * Template definitions for v4.0
 */
enum Template {
	application = "Application :: Full-featured ExpressoTS application. (Recommended)",
	applicationWithEvents = "Application with Events :: Application template pre-wired with the type-safe Event Bus example.",
	micro = "Micro :: A minimalistic template for building micro APIs and serverless functions.",
}

const enum PackageManager {
	npm = "npm",
	yarn = "yarn",
	pnpm = "pnpm",
	bun = "bun",
}

/**
 * Middleware presets for Application template
 */
enum MiddlewarePreset {
	api = "API :: REST API with security, compression, and auto-logging. (Recommended)",
	web = "Web :: Full web app with cookies and session support.",
	graphql = "GraphQL :: Optimized for GraphQL APIs.",
	microservice = "Microservice :: Minimal setup for microservices.",
	minimal = "Minimal :: Just request parsing, customize everything yourself.",
}

type TemplateKeys = keyof typeof Template;
type MiddlewarePresetKeys = keyof typeof MiddlewarePreset;
type ProjectFormArgs = [
	PackageManager,
	TemplateKeys,
	string,
	MiddlewarePresetKeys,
	boolean | undefined,
];

/**
 * Template folder mapping
 */
const TEMPLATE_FOLDERS: Record<string, string> = {
	Application: "application",
	"Application with Events": "application-with-events",
	Micro: "micro",
};

/**
 * Middleware preset mapping to code
 */
const PRESET_CODE: Record<string, string> = {
	API: `this.Middleware.applyPreset("api");`,
	Web: `this.Middleware.applyPreset("web");`,
	GraphQL: [
		`this.Middleware.applyPreset("graphql");`,
		``,
		`        const apolloServer = new ApolloServer({ typeDefs, resolvers });`,
		`        await apolloServer.start();`,
		`        this.Middleware.add({`,
		`            path: "/graphql",`,
		`            middlewares: [expressMiddleware(apolloServer)],`,
		`        });`,
	].join("\n"),
	Microservice: `this.Middleware.applyPreset("microservice");`,
	Minimal: `this.Middleware.parse();`,
};

/**
 * Extra imports that specific presets need appended to app.ts.
 */
const PRESET_IMPORTS: Record<string, string> = {
	GraphQL: [
		`import { ApolloServer } from "@apollo/server";`,
		`import { expressMiddleware } from "@as-integrations/express5";`,
		`import { typeDefs, resolvers } from "./graphql/schema";`,
	].join("\n"),
};

/**
 * Per-preset runtime dependencies. The base application template ships only
 * express + framework packages; each preset declares exactly which optional
 * middleware packages it needs so scaffolded projects stay lean.
 *
 * Versions are pinned with `^` ranges matching the middleware-resolver
 * registry expectations in `@expressots/core`.
 */
const PRESET_DEPENDENCIES: Record<
	string,
	{
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	}
> = {
	API: {
		dependencies: {
			compression: "^1.8.1",
			cors: "^2.8.6",
			"express-rate-limit": "^8.5.1",
			helmet: "^8.1.0",
		},
		devDependencies: {
			"@types/compression": "^1.7.5",
			"@types/cors": "^2.8.17",
		},
	},
	Web: {
		dependencies: {
			compression: "^1.8.1",
			"cookie-parser": "^1.4.7",
			cors: "^2.8.6",
			helmet: "^8.1.0",
		},
		devDependencies: {
			"@types/compression": "^1.7.5",
			"@types/cookie-parser": "^1.4.8",
			"@types/cors": "^2.8.17",
		},
	},
	GraphQL: {
		dependencies: {
			"@apollo/server": "^5.5.1",
			"@as-integrations/express5": "^1.1.2",
			compression: "^1.8.1",
			cors: "^2.8.6",
			graphql: "^16.14.0",
			helmet: "^8.1.0",
		},
		devDependencies: {
			"@types/compression": "^1.7.5",
			"@types/cors": "^2.8.17",
		},
	},
	Microservice: {
		dependencies: {
			compression: "^1.8.1",
		},
		devDependencies: {
			"@types/compression": "^1.7.5",
		},
	},
	Minimal: {},
};

/**
 * Apply the selected middleware preset to the generated app.ts
 */
function applyMiddlewarePreset(directory: string, preset: string): void {
	const appTsPath = path.join(directory, "src", "app.ts");

	if (!fs.existsSync(appTsPath)) {
		return;
	}

	// Extract preset name from selection (e.g., "API :: ..." -> "API")
	const presetMatch = preset.match(/^(\w+) ::/);
	const presetName = presetMatch ? presetMatch[1] : "API";

	const presetCode = PRESET_CODE[presetName] || PRESET_CODE["API"];

	let content = fs.readFileSync(appTsPath, "utf-8");

	// Inject preset-specific imports after the existing import block.
	// Match the first blank line (handles both LF and CRLF endings).
	const extraImports = PRESET_IMPORTS[presetName];
	if (extraImports) {
		const eol = content.includes("\r\n") ? "\r\n" : "\n";
		content = content.replace(
			new RegExp(`${eol}${eol}`),
			`${eol}${extraImports}${eol}${eol}`,
		);
	}

	// Replace the placeholder with the preset code
	content = content.replace(
		/\/\/ __MIDDLEWARE_PRESET_PLACEHOLDER__/,
		presetCode,
	);

	fs.writeFileSync(appTsPath, content, "utf-8");
}

/**
 * GraphQL schema scaffold content. Provides sample typeDefs and resolvers
 * so the generated project has a working `/graphql` endpoint out of the box.
 */
const GRAPHQL_SCHEMA_CONTENT = `export const typeDefs = \`#graphql
    type Query {
        hello: String!
        health: HealthStatus!
    }

    type Mutation {
        echo(message: String!): EchoResponse!
    }

    type HealthStatus {
        status: String!
        timestamp: String!
        uptime: Float!
    }

    type EchoResponse {
        message: String!
        receivedAt: String!
    }
\`;

export const resolvers = {
    Query: {
        hello: () => "Hello from ExpressoTS GraphQL!",
        health: () => ({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        }),
    },
    Mutation: {
        echo: (_: unknown, { message }: { message: string }) => ({
            message,
            receivedAt: new Date().toISOString(),
        }),
    },
};
`;

/**
 * Create additional source files required by specific presets.
 * For example, the GraphQL preset ships a starter schema + resolvers.
 */
function createPresetFiles(directory: string, preset: string): void {
	const presetMatch = preset.match(/^(\w+) ::/);
	const presetName = presetMatch ? presetMatch[1] : "API";

	if (presetName === "GraphQL") {
		const graphqlDir = path.join(directory, "src", "graphql");
		if (!fs.existsSync(graphqlDir)) {
			fs.mkdirSync(graphqlDir, { recursive: true });
		}
		fs.writeFileSync(
			path.join(graphqlDir, "schema.ts"),
			GRAPHQL_SCHEMA_CONTENT,
			"utf-8",
		);
	}
}

/**
 * Inject preset-specific dependencies into the scaffolded project's
 * package.json **before** `npm install` runs, so everything resolves
 * in a single install step.
 */
function injectPresetDependencies(directory: string, preset: string): void {
	const pkgPath = path.join(directory, "package.json");
	if (!fs.existsSync(pkgPath)) return;

	const presetMatch = preset.match(/^(\w+) ::/);
	const presetName = presetMatch ? presetMatch[1] : "API";

	const presetDeps = PRESET_DEPENDENCIES[presetName];
	if (!presetDeps) return;

	const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

	if (presetDeps.dependencies) {
		pkg.dependencies = { ...pkg.dependencies, ...presetDeps.dependencies };
	}
	if (presetDeps.devDependencies) {
		pkg.devDependencies = {
			...pkg.devDependencies,
			...presetDeps.devDependencies,
		};
	}

	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + "\n", "utf-8");
}

/**
 * Enable local template mode for testing.
 * Opt-in via `EXPRESSOTS_DEV=1` and `EXPRESSOTS_USE_LOCAL_TEMPLATES=1`.
 * Both must be set so a stray env var alone cannot redirect a user's
 * `expressots new` to local files.
 */
const USE_LOCAL_TEMPLATES =
	process.env.EXPRESSOTS_DEV === "1" &&
	process.env.EXPRESSOTS_USE_LOCAL_TEMPLATES === "1";

/**
 * Skip the package-manager install step. Useful when iterating on
 * templates that depend on unpublished package versions. Same dual
 * env-var guard as `USE_LOCAL_TEMPLATES`.
 */
const SKIP_INSTALL_FOR_TESTING =
	process.env.EXPRESSOTS_DEV === "1" &&
	process.env.EXPRESSOTS_SKIP_INSTALL === "1";

/**
 * Local templates path (relative to CLI installation)
 * For development: points to the templates folder in the monorepo
 * For production: this will be replaced with the actual path
 */
const LOCAL_TEMPLATES_PATH = path.resolve(__dirname, "../../../templates");

/**
 * Optional override for the templates ref/tag.
 *
 * Useful during the preview window before the matching `vX.Y.Z` tag exists
 * on `expressots/templates`. Setting `EXPRESSOTS_TEMPLATE_REF=feature/v4.0`
 * makes `expressots new` clone from that branch instead of the version tag.
 *
 * This is intentionally NOT gated by `EXPRESSOTS_DEV`: even an installed
 * CLI consumer can opt into a custom ref to test pre-release scaffolds.
 */
const TEMPLATE_REF_OVERRIDE = process.env.EXPRESSOTS_TEMPLATE_REF?.trim() || "";

/**
 * Resolve the degit ref to use when fetching a template.
 *
 * Priority:
 *  1. Explicit override via `EXPRESSOTS_TEMPLATE_REF`
 *  2. The version-pinned tag matching this CLI build (`v${BUNDLE_VERSION}`)
 */
function resolveTemplateRef(): string {
	if (TEMPLATE_REF_OVERRIDE) return TEMPLATE_REF_OVERRIDE;
	return `v${BUNDLE_VERSION}`;
}

/**
 * Build the full degit URL for a given template folder.
 */
function buildTemplateRepo(templateFolder: string, ref: string): string {
	return `expressots/templates/${templateFolder}#${ref}`;
}

/**
 * Detect whether the running CLI is a preview build (e.g.
 * `4.0.0-preview.3`). During the preview window the matching templates tag
 * may not yet exist on GitHub, so we allow a soft fallback to the active
 * release branch.
 */
function isPreviewBuild(): boolean {
	return /-(?:preview|alpha|beta|rc)\b/i.test(BUNDLE_VERSION);
}

/**
 * Fallback ref used when the primary ref is missing AND we are running a
 * preview build. Matches the framework's working branch.
 */
const PREVIEW_FALLBACK_REF = "feature/v4.0";

/**
 * Clone a template from the public `expressots/templates` repo via degit.
 *
 * On `MISSING_REF` we attempt one graceful retry against the preview
 * fallback branch — this keeps `npx @expressots/cli@next new` usable during
 * the window between a CLI publish and the matching templates-tag push.
 * For non-preview builds we let the error propagate so the user gets a
 * loud, accurate diagnostic.
 */
async function cloneFromGitHub({
	templateFolder,
	targetDir,
	progressBar,
}: {
	templateFolder: string;
	targetDir: string;
	progressBar: SingleBar;
}): Promise<void> {
	const primaryRef = resolveTemplateRef();
	const primaryRepo = buildTemplateRepo(templateFolder, primaryRef);

	try {
		await degit(primaryRepo, { force: false }).clone(targetDir);
		progressBar.update(30, { doing: "Template ready" });
		return;
	} catch (err: any) {
		const isMissingRef = err?.code === "MISSING_REF";
		const canFallback =
			isMissingRef && !TEMPLATE_REF_OVERRIDE && isPreviewBuild();

		if (!canFallback) throw err;

		// Tag for this preview hasn't been pushed yet; transparently retry
		// against the working branch and surface a one-line warning so the
		// user knows what they actually got. Written to stdout while the bar
		// renders on stderr, so the streams do not interfere.
		console.log(
			chalk.yellow(
				`\n⚠  Templates tag "${primaryRef}" not found on GitHub yet — falling back to "${PREVIEW_FALLBACK_REF}". ` +
					`Set EXPRESSOTS_TEMPLATE_REF=<branch-or-tag> to override.`,
			),
		);

		const fallbackRepo = buildTemplateRepo(
			templateFolder,
			PREVIEW_FALLBACK_REF,
		);
		await degit(fallbackRepo, { force: false }).clone(targetDir);
		progressBar.update(30, { doing: "Template ready (fallback ref)" });
	}
}

/**
 * Main project creation form
 */
const projectForm = async (
	projectName: string,
	args: ProjectFormArgs,
): Promise<void> => {
	let answer: {
		name: string;
		packageManager: string;
		template: Template;
		preset?: MiddlewarePreset;
		events?: boolean;
		confirm: boolean;
	};

	const [packageManager, template, directory, preset, events] = args;

	if (packageManager && template) {
		const resolvedPreset =
			preset ??
			(template === "application"
				? ("api" as MiddlewarePresetKeys)
				: undefined);

		answer = {
			name: projectName,
			packageManager: packageManager,
			template: Template[template],
			preset: resolvedPreset
				? MiddlewarePreset[resolvedPreset]
				: undefined,
			events: events,
			confirm: true,
		};
	} else {
		const baseAnswers = await inquirer.prompt([
			{
				type: "input",
				name: "name",
				message: "Project name",
				default: projectName,
				transformer: (input: string) => {
					return chalk.yellow(chalk.bold(input));
				},
			},
			{
				type: "list",
				name: "packageManager",
				message: "Package manager",
				choices: [
					"npm",
					"yarn",
					"pnpm",
					...(process.platform !== "win32" ? ["bun"] : []),
				],
			},
			{
				type: "list",
				name: "template",
				message: "Select a template",
				choices: [
					`Application :: Full-featured ExpressoTS application. (${chalk.yellow(
						"Recommended",
					)})`,
					"Micro :: A minimalistic template for building micro APIs and serverless functions.",
				],
			},
		]);

		// Only show preset selection for Application template
		let presetAnswer: { preset?: MiddlewarePreset } = {};
		let eventsAnswer: { events?: boolean } = {};
		if (baseAnswers.template.startsWith("Application")) {
			presetAnswer = await inquirer.prompt([
				{
					type: "list",
					name: "preset",
					message: "Select a middleware preset",
					choices: [
						`API :: REST API with security, compression, and auto-logging. (${chalk.yellow(
							"Recommended",
						)})`,
						"Web :: Full web app with cookies and session support.",
						"GraphQL :: Optimized for GraphQL APIs.",
						"Microservice :: Minimal setup for microservices.",
						"Minimal :: Just request parsing, customize everything yourself.",
					],
				},
			]);

			// Opt-in to the type-safe Event Bus example. Defaults to No
			// so the API/Web/GraphQL/etc. presets stay focused on what
			// the user actually asked for. Picking Yes swaps the
			// scaffold to `application-with-events` (extra event class
			// + handler + `setupEventSystemForExpress` wiring).
			eventsAnswer = await inquirer.prompt([
				{
					type: "confirm",
					name: "events",
					message:
						"Include the type-safe Event Bus example? (adds a sample event + handler)",
					default: false,
				},
			]);
		}

		const confirmAnswer = await inquirer.prompt([
			{
				type: "confirm",
				name: "confirm",
				message: "Do you want to create this project?",
				default: true,
			},
		]);

		answer = {
			...baseAnswers,
			...presetAnswer,
			...eventsAnswer,
			...confirmAnswer,
		};
	}

	if (directory) {
		if (!fs.existsSync(path.join(directory, answer.name))) {
			answer.name = path.join(directory, answer.name);
		} else {
			printError("Directory already exists", directory);
			process.exit(1);
		}
	}

	if (answer.confirm) {
		// Check if package manager is bun and OS is Windows
		if (answer.packageManager === "bun" && process.platform === "win32") {
			printError(
				"bun is not supported on Windows. Please use",
				"npm, yarn or pnpm",
			);
			process.exit(1);
		}

		await checkIfPackageManagerExists(answer.packageManager);

		process.stdout.write(
			`\n  ${chalk.dim("Creating")} ${chalk.bold.green(answer.name)}\n\n`,
		);

		const termCols =
			typeof process.stdout.columns === "number" &&
			process.stdout.columns > 0
				? process.stdout.columns
				: 80;
		const barsize = Math.max(20, Math.min(40, termCols - 22));

		const progressBar = new SingleBar(
			{
				format:
					"  {bar}  " +
					chalk.bold("{percentage}") +
					chalk.dim("%") +
					"  " +
					chalk.dim("{doing}"),
				barCompleteChar: "\u2588",
				barIncompleteChar: "\u2591",
				formatBar: (progress, options) => {
					const completeSize = Math.round(
						progress * (options.barsize ?? barsize),
					);
					const incompleteSize =
						(options.barsize ?? barsize) - completeSize;
					return (
						chalk.green("\u2588".repeat(completeSize)) +
						chalk.dim("\u2591".repeat(incompleteSize))
					);
				},
				barsize,
				hideCursor: true,
				clearOnComplete: false,
				linewrap: false,
			},
			Presets.legacy,
		);

		progressBar.start(100, 0, {
			doing: "Fetching template",
		});

		// Extract template name from selection
		const templateMatch = answer.template.match(/(.*) ::/);
		if (!templateMatch || !templateMatch[1]) {
			progressBar.stop();
			printError(
				`Could not parse selected template: ${answer.template}`,
				"new",
			);
			process.exit(1);
		}
		const templateName = templateMatch[1];
		// The "Application with Events" template is no longer a top-level
		// choice. When the user opts into events on the Application track
		// (or passes `--events`), swap the folder so we still pull from
		// `application-with-events`. The folder split is preserved on disk
		// for now so we keep two minimal sources of truth.
		let templateFolder = TEMPLATE_FOLDERS[templateName];
		if (templateName === "Application" && answer.events) {
			templateFolder = TEMPLATE_FOLDERS["Application with Events"];
		}

		if (!templateFolder) {
			progressBar.stop();
			printError(`Unknown template: ${templateName}`, "new");
			process.exit(1);
		}

		try {
			if (USE_LOCAL_TEMPLATES) {
				// LOCAL TEMPLATE MODE (for testing)
				const localTemplatePath = path.join(
					LOCAL_TEMPLATES_PATH,
					templateFolder,
				);

				if (!fs.existsSync(localTemplatePath)) {
					progressBar.stop();
					printError(
						`Local template not found at: ${localTemplatePath}`,
						"Please check your templates folder",
					);
					process.exit(1);
				}

				// Create target directory
				fs.mkdirSync(answer.name, { recursive: true });

				// Copy template files
				copyDirectorySync(localTemplatePath, answer.name);

				progressBar.update(30, { doing: "Template ready" });
			} else {
				// GITHUB MODE (production)
				// Pinned to the templates tag matching this CLI's published
				// version (e.g. CLI 4.0.0-preview.3 -> templates/v4.0.0-preview.3).
				// BUNDLE_VERSION reads from this package's package.json, so a
				// CLI release and its templates tag move together.
				await cloneFromGitHub({
					templateFolder,
					targetDir: answer.name,
					progressBar,
				});
			}
		} catch (err: any) {
			console.log("\n");
			// Surface the real failure cause so users can self-diagnose
			// instead of guessing at "folder not empty" every time.
			const msg = err?.message ? String(err.message) : String(err);
			const code = err?.code ? ` [${err.code}]` : "";
			if (
				err?.code === "DEST_NOT_EMPTY" ||
				/already exists|not empty/i.test(msg)
			) {
				printError(
					`Target folder "${answer.name}" already exists or is not empty`,
					answer.name,
				);
			} else {
				printError(
					`Failed to scaffold project${code}: ${msg}`,
					answer.name,
				);
			}
			process.exit(1);
		}

		// Apply preset files + placeholder substitution BEFORE install so
		// that a failed/skipped install still leaves the user with a
		// runnable scaffold (the middleware preset placeholder must not
		// leak into src/app.ts as a literal comment).
		if (
			answer.preset &&
			(templateFolder === "application" ||
				templateFolder === "application-with-events")
		) {
			injectPresetDependencies(answer.name, answer.preset);
			createPresetFiles(answer.name, answer.preset);
			applyMiddlewarePreset(answer.name, answer.preset);
		}

		if (answer.packageManager === "pnpm") {
			writePnpmAllowBuildsConfig(answer.name);
		}

		if (SKIP_INSTALL_FOR_TESTING) {
			progressBar.update(90, {
				doing: "Skipping install (testing mode)",
			});
		} else {
			progressBar.update(50, {
				doing: "Installing dependencies",
			});

			await packageManagerInstall({
				packageManager: answer.packageManager,
				directory: answer.name,
				progressBar,
			});
		}

		// Progress should already be at 90% from packageManagerInstall
		// Only update if we skipped installation
		if (!SKIP_INSTALL_FOR_TESTING) {
			progressBar.update(90, { doing: "Finalizing" });
		}

		changePackageName({
			directory: answer.name,
			name: projectName,
		});

		progressBar.update(100);
		progressBar.stop();

		console.log("\n");
		console.log(
			"🐎 Project",
			chalk.green(answer.name),
			"created successfully!",
		);
		console.log("🤙 Run the following commands to start the project:\n");

		console.log(chalk.bold.gray(`$ cd ${answer.name}`));
		switch (answer.packageManager) {
			case "npm":
				console.log(chalk.bold.gray("$ npm run dev"));
				break;
			case "yarn":
				console.log(chalk.bold.gray("$ yarn dev"));
				break;
			case "pnpm":
				console.log(chalk.bold.gray("$ pnpm run dev"));
				break;
			case "bun":
				console.log(chalk.bold.gray("$ bun dev"));
				break;
		}

		console.log("\n");
		console.log(chalk.bold.green(centerText("Happy coding!")));
		console.log(
			chalk.bold.gray(
				centerText(
					"Please consider donating to support the project.\n",
				),
			),
		);
		console.log(
			chalk.bold.white(
				centerText(
					"💖 Sponsor: https://github.com/sponsors/expressots",
				),
			),
		);
		console.log("\n");
	}
};

export { projectForm };
