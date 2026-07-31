import fs from "node:fs";
import path from "node:path";
import {
	getExecCommand,
	getRunScriptCommand,
} from "../utils/package-manager-commands";

export const CLOUDFLARE_COMPATIBILITY_DATE = "2026-07-29";
export const WRANGLER_VERSION = "^4.115.0";

export interface CloudflareTargetOptions {
	targetDir: string;
	projectName: string;
	packageManager?: string;
}

const CLOUDFLARE_API_SOURCE = `import {
    cloudflareAdapter,
    micro,
} from "@expressots/adapter-express";

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
	const login = getExecCommand(packageManager, "wrangler", ["login"]);
	const loginCommand = [login.command, ...login.args].join(" ");

	return `# ExpressoTS Cloudflare Worker

This ExpressoTS micro API runs on Cloudflare Workers through Wrangler.

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

	pkg.devDependencies = {
		...pkg.devDependencies,
		wrangler: WRANGLER_VERSION,
	};
	delete pkg.devDependencies["@expressots/studio"];
	delete pkg.devDependencies["@expressots/studio-agent"];

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
}
