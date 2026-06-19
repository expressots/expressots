import fs from "node:fs";
import path from "node:path";

/**
 * pnpm 11+ requires lifecycle scripts to be explicitly approved via
 * `pnpm-workspace.yaml#allowBuilds`, otherwise `pnpm install` exits with
 * ERR_PNPM_IGNORED_BUILDS. Only scaffold this file when the user picks pnpm.
 */
export const PNPM_ALLOW_BUILDS_YAML = `# pnpm 11+ requires every dependency that ships a lifecycle (install / postinstall)
# script to be explicitly approved, otherwise \`pnpm install\` exits 1 with
# ERR_PNPM_IGNORED_BUILDS. The packages below are pulled transitively by the
# ExpressoTS Studio agent (OpenTelemetry), tsx / vite / vitest, and
# typescript-eslint, and all need their build scripts to run.
#
# Flip any of these to \`false\` if you would rather skip the native build for
# that package (the dep will still install, just without its postinstall step).
allowBuilds:
  better-sqlite3: true
  esbuild: true
  protobufjs: true
  unrs-resolver: true
`;

export function writePnpmAllowBuildsConfig(projectDir: string): void {
	fs.writeFileSync(
		path.join(projectDir, "pnpm-workspace.yaml"),
		PNPM_ALLOW_BUILDS_YAML,
		"utf8",
	);
}
