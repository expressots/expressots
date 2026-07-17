/**
 * Verifies that `expressots new` pins template clones to the templates tag
 * matching the CLI's own published version. The expected ref is derived from
 * package.json at runtime, so a version bump can never silently drift from
 * the tag we clone. Exercises the real buildTemplateRepo() and
 * resolveTemplateRef() from src/new/form.ts.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

// src/cli.ts wires up the whole yargs CLI at module load (and may call
// process.exit), so we replace it with just the constant form.ts needs.
// BUNDLE_VERSION is still sourced from the real package.json, matching
// what readBundleVersion() resolves in production.
jest.mock("../../src/cli", () => ({
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	BUNDLE_VERSION: require("../../package.json").version,
}));

import { buildTemplateRepo, resolveTemplateRef } from "../../src/new/form";

const pkg = JSON.parse(
	readFileSync(path.resolve(__dirname, "../../package.json"), "utf8"),
) as { version: string };

describe("new: template repo pinning", () => {
	const originalRefOverride = process.env.EXPRESSOTS_TEMPLATE_REF;

	afterEach(() => {
		if (originalRefOverride === undefined) {
			delete process.env.EXPRESSOTS_TEMPLATE_REF;
		} else {
			process.env.EXPRESSOTS_TEMPLATE_REF = originalRefOverride;
		}
	});

	it("resolves the template ref to the tag matching the CLI version", () => {
		expect(resolveTemplateRef()).toBe(`v${pkg.version}`);
	});

	it("builds a degit URL pinned to the version tag (no branch pins)", () => {
		const ref = resolveTemplateRef();
		const repo = buildTemplateRepo("application", ref);

		expect(repo).toBe(`expressots/templates/application#v${pkg.version}`);
		// Reproducibility contract: every clone must carry an explicit ref.
		expect(repo).toContain("#");
		// Guard against drift back to a moving branch pin.
		expect(repo).not.toContain("#feature/");
		expect(repo).not.toContain("#main");
	});

	it("builds the URL for every known template folder", () => {
		const ref = resolveTemplateRef();
		for (const folder of [
			"application",
			"application-with-events",
			"micro",
		]) {
			expect(buildTemplateRepo(folder, ref)).toBe(
				`expressots/templates/${folder}#v${pkg.version}`,
			);
		}
	});

	it("honors the EXPRESSOTS_TEMPLATE_REF override", () => {
		process.env.EXPRESSOTS_TEMPLATE_REF = "feature/v4.0";
		jest.resetModules();
		jest.isolateModules(() => {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const form = require("../../src/new/form");
			expect(form.resolveTemplateRef()).toBe("feature/v4.0");
			expect(form.buildTemplateRepo("micro", form.resolveTemplateRef())).toBe(
				"expressots/templates/micro#feature/v4.0",
			);
		});
	});
});
