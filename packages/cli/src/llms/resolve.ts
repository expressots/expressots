import fs from "fs";
import path from "path";

export interface LlmsLookup {
	/** Where the package was found (symlinks resolved), or null when it is not installed. */
	packageDir: string | null;
	/** Installed version, when found. */
	version: string | null;
	/** Absolute path of the package's llms.txt, or null when it ships none. */
	llmsPath: string | null;
}

const NOT_INSTALLED: LlmsLookup = {
	packageDir: null,
	version: null,
	llmsPath: null,
};

/**
 * Locate a package's `llms.txt` as installed for the project at `cwd`.
 *
 * Walks up from `cwd` looking for `node_modules/<name>/package.json`, the
 * same lookup Node performs for a bare import, and follows symlinks so pnpm
 * and workspace links land on the real package directory.
 *
 * Deliberately not `require.resolve`: the package's `exports` map hides
 * `llms.txt`, resolving the entry point lands inside `lib/`, where the build
 * copies a second package.json, and under Jest `require.resolve` answers
 * from the test file's own module tree rather than `cwd`.
 */
export function resolveLlms(packageName: string, cwd: string): LlmsLookup {
	const segments = packageName.split("/");
	let dir = path.resolve(cwd);

	for (;;) {
		const candidate = path.join(dir, "node_modules", ...segments);
		const manifest = path.join(candidate, "package.json");
		if (fs.existsSync(manifest)) {
			let packageDir = candidate;
			try {
				packageDir = fs.realpathSync(candidate);
			} catch {
				// keep the unresolved path
			}
			let version: string | null = null;
			try {
				const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
				version = typeof pkg.version === "string" ? pkg.version : null;
			} catch {
				// unreadable manifest: still report the install location
			}
			const llmsPath = path.join(packageDir, "llms.txt");
			return {
				packageDir,
				version,
				llmsPath: fs.existsSync(llmsPath) ? llmsPath : null,
			};
		}

		const parent = path.dirname(dir);
		if (parent === dir) {
			return NOT_INSTALLED;
		}
		dir = parent;
	}
}
