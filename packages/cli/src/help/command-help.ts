import chalk from "chalk";
import { stdout } from "process";
import { type HelpEntry, type HelpGroup, renderHelpGroups } from "./render";

/**
 * A structured description of a single command's help surface. Rendered by
 * {@link printCommandHelp} so every subcommand `--help` shares the exact visual
 * language of the top-level help screen (see `main-help.ts`) and the command
 * reference (`help/form.ts`), instead of yargs' sprawling default table.
 */
export interface CommandHelpSpec {
	/** Canonical command name, e.g. `costs`. */
	name: string;
	/** Command aliases, e.g. `["cost", "pricing"]`. */
	aliases?: string[];
	/** Usage line, e.g. `expressots costs <action> [options]`. */
	usage: string;
	/** One-line description (matches the yargs `describe`). */
	description: string;
	/** Titled groups of entries (Arguments, Actions, Options, ...). */
	groups: HelpGroup[];
	/** Optional trailing notes / examples (rendered dim). */
	notes?: string[];
	/** Optional docs URL. */
	docs?: string;
}

const DEFAULT_DOCS = "https://doc.expresso-ts.com/docs/category/cli";

/**
 * Build an option/argument entry with an optional dim "hint" (choices,
 * defaults, examples) appended to the description. Keeps the help compact while
 * still surfacing the metadata yargs would otherwise sprawl across the line.
 */
export function helpEntry(
	name: string,
	desc: string,
	hint?: string,
): HelpEntry {
	return { name, desc: hint ? `${desc} ${chalk.dim(`(${hint})`)}` : desc };
}

/**
 * Print a refined, grouped, column-aligned help screen for a single command.
 *
 * Each group is rendered with its own column width so short action names and
 * long option flags both stay tightly aligned.
 */
export function printCommandHelp(
	spec: CommandHelpSpec,
	version?: string,
): void {
	const title = version
		? `🐎 ExpressoTS CLI v${version}`
		: "🐎 ExpressoTS CLI";

	const lines: string[] = [
		"",
		chalk.bold.green(title),
		"",
		`${chalk.bold("Usage:")} ${spec.usage}`,
		"",
		spec.description,
	];

	if (spec.aliases && spec.aliases.length > 0) {
		lines.push(
			"",
			`${chalk.bold("Aliases:")} ${spec.aliases
				.map((a) => chalk.green(a))
				.join(", ")}`,
		);
	}

	// Render each group independently so columns stay tight per-section.
	for (const group of spec.groups) {
		lines.push(...renderHelpGroups([group]));
	}

	if (spec.notes && spec.notes.length > 0) {
		lines.push("");
		for (const note of spec.notes) {
			lines.push(chalk.dim(note));
		}
	}

	lines.push(
		"",
		chalk.dim("Global: -h, --help · -V, --version"),
		"",
		`📝  ${chalk.dim("Docs:")} ${chalk.green(spec.docs ?? DEFAULT_DOCS)}`,
		"",
	);

	stdout.write(`${lines.join("\n")}\n`);
}
