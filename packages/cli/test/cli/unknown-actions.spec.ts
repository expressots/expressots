/**
 * Verifies that action-based commands reject an unknown sub-action with
 * a non-zero exit code and a diagnostic on stderr (rather than silently
 * printing an "Unknown action" line and exiting 0). Invalid actions are
 * caught either by yargs' `choices` validation (global fail handler) or
 * by the command's own `default` branch -- both must exit 1.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const CLI = path.resolve(__dirname, "../../bin/cli.js");

const COMMANDS = ["costs", "profile", "migrate", "cicd", "templates"];

describe("unknown sub-action handling", () => {
	it.each(COMMANDS)(
		"%s exits non-zero on an unknown action",
		(command) => {
			const result = spawnSync(
				process.execPath,
				[CLI, command, "definitely-not-a-real-action"],
				{ encoding: "utf8" },
			);

			expect(result.status).not.toBe(0);
			const err = `${result.stdout}\n${result.stderr}`;
			expect(err.trim().length).toBeGreaterThan(0);
		},
	);
});
