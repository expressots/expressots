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

export interface CloudflareTargetOptions {
	targetDir: string;
	projectName: string;
	packageManager?: string;
}

const CLOUDFLARE_API_SOURCE = `import { cloudflareAdapter, micro } from "@expressots/adapter-express";

const app = micro({
    autoParseJson: false,
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
        const response = await worker.fetch(new Request("http://localhost/"), env, ctx);

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
> Keep \`autoParseJson: false\` in \`src/api.ts\`. The Cloudflare adapter parses
> request bodies before passing them to Express. Stream-reading middleware such
> as \`express.json()\`, \`express.urlencoded()\`, \`express.text()\`, and
> \`express.raw()\` is not supported by this target and can make requests fail at
> runtime.

## Known constraints

- Read parsed request data from \`req.body\`; do not add Express body parsers.
- \`app.setErrorHandler()\` is not wired for Workers because the serverless
  handler does not call \`app.listen()\`. Until
  [#950](https://github.com/expressots/expressots/issues/950) is resolved,
  handle expected errors in route handlers. Unexpected errors return a generic
  500 response.

## Install

\`\`\`bash
${installCommand}
\`\`\`

## Local development

\`\`\`bash
${devCommand}
\`\`\`

The development script runs \`wrangler dev\`, which uses the local Workers
runtime and provides Cloudflare bindings. \`ex dev\` starts the regular Node.js
development workflow, so it is not used for this target.

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

function configureWorkerGitignore(targetDir: string): void {
	const gitignorePath = path.join(targetDir, ".gitignore");
	const gitignore = fs.readFileSync(gitignorePath, "utf8");
	const cleanedGitignore = gitignore
		.replace("# Environment files (except examples)", "# Environment files")
		.replace(/^!\.env\.example\r?\n?/m, "");
	const entries = ["/.wrangler/", "/worker-configuration.d.ts"];
	const existingLines = new Set(cleanedGitignore.split(/\r?\n/));
	const additions = entries.filter((entry) => !existingLines.has(entry));

	if (additions.length === 0 && cleanedGitignore === gitignore) {
		return;
	}

	const separator = cleanedGitignore.endsWith("\n") ? "" : "\n";
	const cloudflareSection =
		additions.length > 0
			? `${separator}\n# Cloudflare Workers\n${additions.join("\n")}\n`
			: "";
	fs.writeFileSync(
		gitignorePath,
		`${cleanedGitignore}${cloudflareSection}`,
		"utf8",
	);
}

function configureWorkerTypes(targetDir: string): void {
	const tsconfigPath = path.join(targetDir, "tsconfig.json");
	const tsconfig = fs.readFileSync(tsconfigPath, "utf8");
	const includePattern = /("include"\s*:\s*)\[[\s\S]*?\]/;

	if (!includePattern.test(tsconfig)) {
		throw new Error(
			"Unable to configure Cloudflare types: tsconfig.json has no include array.",
		);
	}

	fs.writeFileSync(
		tsconfigPath,
		tsconfig.replace(
			includePattern,
			'$1["src/**/*.ts", "test/**/*.ts", "worker-configuration.d.ts"]',
		),
		"utf8",
	);
}

function removeNodeScaffoldArtifacts(targetDir: string): void {
	for (const relativePath of [
		"AGENTS.md",
		".env.example",
		"examples",
		"expressots.config.ts",
		"tsconfig.build.json",
	]) {
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

	const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
		main?: string;
		engines?: Record<string, string>;
		scripts?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};

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
	configureWorkerGitignore(targetDir);
	configureWorkerTypes(targetDir);
	removeNodeScaffoldArtifacts(targetDir);
}
