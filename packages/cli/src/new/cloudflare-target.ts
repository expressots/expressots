import fs from "node:fs";
import path from "node:path";

export const CLOUDFLARE_COMPATIBILITY_DATE = "2026-07-31";
export const WRANGLER_VERSION = "^4.95.0";

export interface CloudflareTargetOptions {
	targetDir: string;
	projectName: string;
}

const CLOUDFLARE_README_HEADING = "## Cloudflare Workers";

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

const CLOUDFLARE_README_SECTION = `## Cloudflare Workers

This project targets Cloudflare Workers and uses Wrangler for development,
build validation, and deployment.

\`\`\`bash
npm run dev
npm run build
npx wrangler login
npm run deploy
\`\`\`

\`wrangler dev\` runs the application in the local Workers runtime and makes
Cloudflare bindings available. \`expressots dev\` starts a regular Node.js
process, so it is not used by this target.

The Worker enables \`nodejs_compat\` because ExpressoTS currently runs through
the Express adapter. Review Cloudflare's Express deployment tutorial and the
ExpressoTS micro API guide for additional background.

- [Deploy an Express app to Cloudflare Workers](https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/)
- [ExpressoTS micro API guide](https://expresso-ts.com/docs/guides/micro-api)
`;

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
}: CloudflareTargetOptions): void {
	const packagePath = path.join(targetDir, "package.json");
	const readmePath = path.join(targetDir, "README.md");
	const apiPath = path.join(targetDir, "src", "api.ts");
	const wranglerPath = path.join(targetDir, "wrangler.toml");

	const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
		scripts?: Record<string, string>;
		devDependencies?: Record<string, string>;
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

	const readme = fs.readFileSync(readmePath, "utf8");
	if (!readme.includes(CLOUDFLARE_README_HEADING)) {
		fs.writeFileSync(
			readmePath,
			`${readme.trimEnd()}\n\n${CLOUDFLARE_README_SECTION}\n`,
			"utf8",
		);
	}
}
