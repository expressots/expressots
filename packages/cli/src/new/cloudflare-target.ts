import fs from "node:fs";
import path from "node:path";
import {
	getExecCommand,
	getRunScriptCommand,
} from "../utils/package-manager-commands";

// Bump these together when preparing a CLI release, after checking the latest
// compatibility date supported by the selected Wrangler/workerd version.
export const CLOUDFLARE_COMPATIBILITY_DATE = "2026-07-29";
export const WRANGLER_VERSION = "^4.115.0";

/**
 * Files the micro template ships for the Node.js workflow that have no
 * meaning on Workers. Also used to prune the tsconfig `include` array, so
 * the two never drift apart.
 */
const NODE_ONLY_SCAFFOLD_PATHS = [
	".env.example",
	"examples",
	"expressots.config.ts",
	"tsconfig.build.json",
] as const;

const WORKER_TYPES_FILE = "worker-configuration.d.ts";

export interface CloudflareTargetOptions {
	targetDir: string;
	projectName: string;
	packageManager?: string;
}

const CLOUDFLARE_API_SOURCE = `import { cloudflareAdapter, micro } from "@expressots/adapter-express";

const app = micro({
    showBanner: false,
    studio: { enabled: false },
});

app.get("/", () => "Hello from ExpressoTS on Cloudflare Workers!");

app.get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
}));

export default cloudflareAdapter(app.getApp());
`;

const CLOUDFLARE_TEST_SOURCE = `import worker from "../src/api";

const env = {};
const ctx = {
    waitUntil: (_promise: Promise<unknown>) => undefined,
    passThroughOnException: () => undefined,
};

describe("Cloudflare Worker", () => {
    it("returns the welcome message on GET /", async () => {
        const response = await worker.fetch(
            new Request("http://localhost/"),
            env,
            ctx,
        );

        expect(response.status).toBe(200);
        expect(await response.text()).toBe(
            "Hello from ExpressoTS on Cloudflare Workers!",
        );
    });

    it("returns health details on GET /health", async () => {
        const response = await worker.fetch(
            new Request("http://localhost/health"),
            env,
            ctx,
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            status: "ok",
            timestamp: expect.any(String),
        });
    });
});
`;

/**
 * Workers-flavoured replacement for the template's AGENTS.md. The Node.js
 * version documents `app.listen`, `.env` and `ex prod`, none of which exist
 * on this target — and this is the first file a coding agent reads, so
 * leaving it stale is worse than the README being right.
 */
function createCloudflareAgentsDoc(packageManager: string): string {
	const devCommand = getRunScriptCommand(packageManager, "dev");
	const testCommand = getRunScriptCommand(packageManager, "test");
	const buildCommand = getRunScriptCommand(packageManager, "build");
	const deployCommand = getRunScriptCommand(packageManager, "deploy");
	const typesCommand = getRunScriptCommand(packageManager, "types");

	return `# Agent instructions

ExpressoTS v4 micro API targeting **Cloudflare Workers**: single-file,
functional style. No DI container. Runs on workerd, not Node.js.

## Entry points

- \`src/api.ts\` is the whole app and the Worker module. \`micro()\` from
  \`@expressots/adapter-express\` creates the app; routes are
  \`app.get("/path", handler)\`; the default export is
  \`cloudflareAdapter(app.getApp())\`.
- Keep the single-file style. Add routes to \`src/api.ts\`; do not create
  controllers, modules, or usecases here.
- \`wrangler.toml\` is the Worker config: name, entrypoint, compatibility date
  and the \`nodejs_compat\` flag.

## Hard constraints on this target

- **Never add Express body-parsing middleware.** The adapter parses the
  request body before Express sees it and hands Express a mock request rather
  than a stream. \`express.json()\`, \`express.urlencoded()\`, \`express.text()\`,
  \`express.raw()\`, \`multer()\` and \`compression()\` cannot run here. Read
  request data from \`req.body\`. \`micro()\`'s own parsers are disabled
  automatically on this runtime; registering one explicitly throws a named
  error at startup rather than failing per request.
- **Never call \`app.listen()\`.** Workers has no HTTP port; the runtime invokes
  the exported \`fetch\` handler. There is no \`ex dev\` here and
  \`@expressots/cli\` is not a dependency of this project.
- **Responses are buffered, not streamed.** The adapter collects the whole
  body before returning it.
- **No \`.env\` files.** Configuration comes from \`wrangler.toml\` vars and
  secrets, reachable through the bindings on the request context.
- Request bodies are parsed by content type: JSON and \`application/*+json\`
  and URL-encoded forms arrive as objects; text and bodies with no content
  type arrive as strings.

## Commands

- \`${devCommand}\`: \`wrangler dev\` on the local Workers runtime.
- \`${testCommand}\`: Jest against the exported \`fetch\` handler, no HTTP port.
- \`${buildCommand}\`: \`wrangler deploy --dry-run\` to validate the bundle.
- \`${deployCommand}\`: deploy to Cloudflare.
- \`${typesCommand}\`: regenerate \`${WORKER_TYPES_FILE}\` after editing
  \`wrangler.toml\`.

## Do not use v3 APIs

These were removed in v4. Never write or suggest:

- \`AppFactory\` (v4 uses \`micro()\` here).
- \`BaseController\` (no controllers in this template at all).
- \`IMiddleware\` (use \`app.use\` with Express middleware — subject to the
  body-parser constraint above).
- \`ExpressoConfig\` imported from \`@expressots/core\`
  (config types come from \`@expressots/shared\`).
`;
}

function getInstallCommand(packageManager: string): string {
	switch (packageManager) {
		case "pnpm":
			return "pnpm install";
		case "yarn":
			return "yarn install";
		case "bun":
			return "bun install";
		default:
			return "npm install";
	}
}

function createCloudflareReadme(packageManager: string): string {
	const installCommand = getInstallCommand(packageManager);
	const devCommand = getRunScriptCommand(packageManager, "dev");
	const buildCommand = getRunScriptCommand(packageManager, "build");
	const deployCommand = getRunScriptCommand(packageManager, "deploy");
	const testCommand = getRunScriptCommand(packageManager, "test");
	const typesCommand = getRunScriptCommand(packageManager, "types");
	const login = getExecCommand(packageManager, "wrangler", ["login"]);
	const loginCommand = [login.command, ...login.args].join(" ");

	return `# ExpressoTS Cloudflare Worker

This ExpressoTS micro API runs on Cloudflare Workers through Wrangler.

> [!IMPORTANT]
> Express body-parsing middleware does not work on this target. The adapter
> reads and parses the request body itself, then hands Express a mock request
> rather than a stream — so \`express.json()\`, \`express.urlencoded()\`,
> \`express.text()\`, \`express.raw()\`, \`multer()\` and \`compression()\` cannot
> run here. Read parsed data from \`req.body\` instead.

## Known constraints

- Read parsed request data from \`req.body\`; do not add Express body parsers.
  \`micro()\`'s built-in parsers stand down automatically on this runtime, and
  registering one yourself fails at \`wrangler dev\` startup with a named error
  rather than silently returning 500 on every request.
- Streaming responses are not supported; the adapter buffers the full body
  before returning it.

## Install

\`\`\`bash
${installCommand}
\`\`\`

## Local development

\`\`\`bash
${devCommand}
\`\`\`

The development script runs \`wrangler dev\`, which uses the local Workers
runtime and provides Cloudflare bindings.

This target does not use the ExpressoTS CLI (\`ex dev\` and friends) — those
commands drive a Node.js HTTP server, which Workers does not run.
\`@expressots/cli\` is therefore not installed as a dependency of this project.
Wrangler owns the development, build, and deployment workflow instead.

## Project structure

\`\`\`text
src/api.ts                 Worker entrypoint and micro routes
test/api.spec.ts           Jest tests that call the Worker fetch handler
wrangler.toml              Cloudflare Worker configuration
worker-configuration.d.ts  Generated binding types (after running the types script)
\`\`\`

## Defining routes

\`\`\`ts
app.get("/users", () => ({ users: [] }));
app.post("/users", (req) => ({ received: req.body }));
\`\`\`

Return values are serialized by the micro API. The adapter supports JSON,
\`application/*+json\`, URL-encoded forms, and text request bodies.

## Test

\`\`\`bash
${testCommand}
\`\`\`

The generated tests call the exported Worker handler directly without opening
a Node.js HTTP port.

## Generate binding types

\`\`\`bash
${typesCommand}
\`\`\`

Wrangler writes \`worker-configuration.d.ts\`, which is included by
\`tsconfig.json\` and ignored by Git.

## Dry-run build

\`\`\`bash
${buildCommand}
\`\`\`

The build script runs \`wrangler deploy --dry-run\` to validate the Worker
bundle without deploying it.

## Login and deploy

\`\`\`bash
${loginCommand}
${deployCommand}
\`\`\`

## Cloudflare Workers

The generated \`wrangler.toml\` enables \`nodejs_compat\` because ExpressoTS
currently uses Node.js-compatible APIs through the Express adapter.
`;
}

/**
 * Read a file the micro template is expected to ship, converting the raw
 * ENOENT into a message that names the missing file and the target that
 * wanted it. Template drift should read as a template problem, not as a
 * stack trace from the middle of a scaffold.
 */
function readTemplateFile(targetDir: string, relativePath: string): string {
	try {
		return fs.readFileSync(path.join(targetDir, relativePath), "utf8");
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Cloudflare target: cannot read "${relativePath}" from the micro template (${reason}).`,
		);
	}
}

function configureWorkerGitignore(targetDir: string): void {
	const gitignorePath = path.join(targetDir, ".gitignore");
	const gitignore = readTemplateFile(targetDir, ".gitignore");

	// The template keeps `.env.example` out of the ignore rules with a
	// negation. This target deletes that file, so the negation would dangle.
	// Match on the rule itself rather than on the comment above it: comment
	// wording is prose and drifts, the rule is the contract.
	const lines = gitignore.split(/\r?\n/);
	const cleanedLines = lines
		.filter((line) => line.trim() !== "!.env.example")
		.map((line) =>
			/^#.*environment files/i.test(line) ? "# Environment files" : line,
		);

	const entries = ["/.wrangler/", "/worker-configuration.d.ts"];
	const existing = new Set(cleanedLines.map((line) => line.trim()));
	const additions = entries.filter((entry) => !existing.has(entry));

	let cleanedGitignore = cleanedLines.join("\n");
	if (additions.length > 0) {
		const separator = cleanedGitignore.endsWith("\n") ? "" : "\n";
		cleanedGitignore += `${separator}\n# Cloudflare Workers\n${additions.join("\n")}\n`;
	}

	if (cleanedGitignore === gitignore) {
		return;
	}

	fs.writeFileSync(gitignorePath, cleanedGitignore, "utf8");
}

function configureWorkerTypes(targetDir: string): void {
	const tsconfigPath = path.join(targetDir, "tsconfig.json");
	const tsconfig = readTemplateFile(targetDir, "tsconfig.json");

	// The template tsconfig carries `//` comments, so it is JSONC and cannot
	// go through JSON.parse. Capture just the `include` array and rewrite it
	// in place: everything else in the file — comments included — is
	// preserved byte-for-byte.
	const includePattern = /("include"\s*:\s*)(\[[\s\S]*?\])/;
	const match = tsconfig.match(includePattern);

	if (!match) {
		throw new Error(
			"Cloudflare target: tsconfig.json has no include array to configure.",
		);
	}

	let currentInclude: Array<string>;
	try {
		currentInclude = JSON.parse(match[2]) as Array<string>;
	} catch {
		throw new Error(
			`Cloudflare target: could not parse the tsconfig.json include array (${match[2]}).`,
		);
	}

	// Preserve whatever else the template includes rather than overwriting
	// with a fixed list — a future template entry should survive this target.
	// Only drop entries whose files this target removes.
	const removedFromScaffold = new Set<string>(NODE_ONLY_SCAFFOLD_PATHS);
	const nextInclude = currentInclude.filter(
		(entry) => !removedFromScaffold.has(entry),
	);

	if (!nextInclude.includes(WORKER_TYPES_FILE)) {
		nextInclude.push(WORKER_TYPES_FILE);
	}

	// Replace via a function so `$`-sequences in a path can never be read as
	// replacement patterns.
	const serializedInclude = `[${nextInclude
		.map((entry) => JSON.stringify(entry))
		.join(", ")}]`;

	fs.writeFileSync(
		tsconfigPath,
		tsconfig.replace(includePattern, (_full, prefix: string) => {
			return `${prefix}${serializedInclude}`;
		}),
		"utf8",
	);
}

function removeNodeScaffoldArtifacts(targetDir: string): void {
	for (const relativePath of NODE_ONLY_SCAFFOLD_PATHS) {
		fs.rmSync(path.join(targetDir, relativePath), {
			recursive: true,
			force: true,
		});
	}
}

export function normalizeWorkerName(projectName: string): string {
	const nameSegments = projectName.split(/[\\/]/).filter(Boolean);
	const leafName = nameSegments[nameSegments.length - 1] ?? projectName;
	const normalized = leafName
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 63)
		.replace(/-+$/g, "");

	return normalized || "expressots-worker";
}

export function applyCloudflareTarget({
	targetDir,
	projectName,
	packageManager = "npm",
}: CloudflareTargetOptions): void {
	const packagePath = path.join(targetDir, "package.json");
	const readmePath = path.join(targetDir, "README.md");
	const apiPath = path.join(targetDir, "src", "api.ts");
	const testPath = path.join(targetDir, "test", "api.spec.ts");
	const wranglerPath = path.join(targetDir, "wrangler.toml");

	const packageSource = readTemplateFile(targetDir, "package.json");
	let pkg: {
		main?: string;
		description?: string;
		engines?: Record<string, string>;
		scripts?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};

	try {
		pkg = JSON.parse(packageSource);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Cloudflare target: package.json in the micro template is not valid JSON (${reason}).`,
		);
	}

	// The template description advertises the Node-only example apps this
	// target removes.
	pkg.description =
		"ExpressoTS micro API running on Cloudflare Workers via Wrangler";

	pkg.engines = {
		...pkg.engines,
		node: ">=22.0.0",
	};

	pkg.scripts = {
		...pkg.scripts,
		build: "wrangler deploy --dry-run",
		dev: "wrangler dev",
		deploy: "wrangler deploy",
		types: "wrangler types",
	};
	delete pkg.scripts.prod;
	delete pkg.scripts.studio;
	delete pkg.scripts["example:circuit-breaker"];
	delete pkg.scripts["example:service-discovery"];
	delete pkg.scripts["example:service-client"];
	delete pkg.scripts["example:full-di-api"];
	delete pkg.main;

	pkg.devDependencies = {
		...pkg.devDependencies,
		wrangler: WRANGLER_VERSION,
	};
	delete pkg.devDependencies["@expressots/cli"];
	delete pkg.devDependencies["@expressots/studio"];
	delete pkg.devDependencies["@expressots/studio-agent"];
	delete pkg.devDependencies.tsx;

	fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 4)}\n`, "utf8");
	fs.writeFileSync(apiPath, CLOUDFLARE_API_SOURCE, "utf8");
	fs.writeFileSync(testPath, CLOUDFLARE_TEST_SOURCE, "utf8");
	fs.writeFileSync(
		wranglerPath,
		[
			`name = "${normalizeWorkerName(projectName)}"`,
			'main = "src/api.ts"',
			`compatibility_date = "${CLOUDFLARE_COMPATIBILITY_DATE}"`,
			'compatibility_flags = ["nodejs_compat"]',
			"",
		].join("\n"),
		"utf8",
	);

	fs.writeFileSync(
		readmePath,
		createCloudflareReadme(packageManager),
		"utf8",
	);
	fs.writeFileSync(
		path.join(targetDir, "AGENTS.md"),
		createCloudflareAgentsDoc(packageManager),
		"utf8",
	);
	configureWorkerGitignore(targetDir);
	configureWorkerTypes(targetDir);
	removeNodeScaffoldArtifacts(targetDir);
}
