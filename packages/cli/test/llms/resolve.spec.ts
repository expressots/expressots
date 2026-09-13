import fs from "fs";
import os from "os";
import path from "path";
import { resolveLlms } from "../../src/llms/resolve";

function fakeProject(withLlms: boolean): string {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-llms-"));
	// pnpm layout: the project sees a symlink in node_modules that points at
	// the real package directory in the store.
	const store = path.join(
		root,
		"node_modules",
		".pnpm",
		"core@4.3.0",
		"node_modules",
		"@expressots",
		"core",
	);
	fs.mkdirSync(store, { recursive: true });
	fs.writeFileSync(
		path.join(store, "package.json"),
		JSON.stringify({ name: "@expressots/core", version: "4.3.0" }),
	);
	if (withLlms) {
		fs.writeFileSync(path.join(store, "llms.txt"), "# @expressots/core\n");
	}
	fs.mkdirSync(path.join(root, "node_modules", "@expressots"), {
		recursive: true,
	});
	fs.symlinkSync(
		store,
		path.join(root, "node_modules", "@expressots", "core"),
		"dir",
	);
	return root;
}

describe("llms/resolve", () => {
	const roots: Array<string> = [];
	afterEach(() => {
		for (const root of roots.splice(0)) {
			fs.rmSync(root, { recursive: true, force: true });
		}
	});

	it("finds llms.txt at the real package root behind a pnpm symlink", () => {
		const root = fakeProject(true);
		roots.push(root);

		const lookup = resolveLlms("@expressots/core", root);

		expect(lookup.version).toBe("4.3.0");
		expect(lookup.packageDir).toBe(
			fs.realpathSync(
				path.join(root, "node_modules", "@expressots", "core"),
			),
		);
		expect(lookup.llmsPath).toBe(
			path.join(lookup.packageDir as string, "llms.txt"),
		);
		expect(fs.readFileSync(lookup.llmsPath as string, "utf8")).toContain(
			"@expressots/core",
		);
	});

	it("walks up from a nested working directory", () => {
		const root = fakeProject(true);
		roots.push(root);
		const nested = path.join(root, "src", "deep");
		fs.mkdirSync(nested, { recursive: true });

		expect(resolveLlms("@expressots/core", nested).llmsPath).not.toBeNull();
	});

	it("reports an installed package that ships no llms.txt", () => {
		const root = fakeProject(false);
		roots.push(root);

		const lookup = resolveLlms("@expressots/core", root);

		expect(lookup.packageDir).not.toBeNull();
		expect(lookup.version).toBe("4.3.0");
		expect(lookup.llmsPath).toBeNull();
	});

	it("reports a package that is not installed", () => {
		const root = fs.mkdtempSync(
			path.join(os.tmpdir(), "expressots-llms-empty-"),
		);
		roots.push(root);

		expect(resolveLlms("@expressots/core", root)).toEqual({
			packageDir: null,
			version: null,
			llmsPath: null,
		});
	});
});
