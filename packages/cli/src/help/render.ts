import chalk from "chalk";

/**
 * A single command/option row in a help surface.
 */
export interface HelpEntry {
	name: string;
	alias?: string;
	desc: string;
}

/**
 * A titled group of entries (e.g. "Project", "DevOps").
 */
export interface HelpGroup {
	title: string;
	entries: HelpEntry[];
}

/**
 * Format an alias as `(g)`, or an empty string when there is none.
 */
export function formatAlias(alias?: string): string {
	return alias ? `(${alias})` : "";
}

/**
 * Render one aligned row: `  name   alias   description`.
 */
export function renderRow(
	entry: HelpEntry,
	nameWidth: number,
	aliasWidth: number,
): string {
	const name = chalk.green(entry.name.padEnd(nameWidth));
	const alias = chalk.dim(formatAlias(entry.alias).padEnd(aliasWidth));
	return `  ${name}  ${alias}  ${entry.desc}`;
}

/**
 * Render grouped, column-aligned rows. A single name/alias width is
 * computed across *all* groups so every column lines up, giving every
 * help surface (top-level help, resources reference) one cohesive look.
 *
 * Returns the lines (no trailing newline). Each group is preceded by a
 * blank line and a bold cyan title.
 */
export function renderHelpGroups(groups: HelpGroup[]): string[] {
	const all = groups.flatMap((g) => g.entries);
	const nameWidth = Math.max(...all.map((e) => e.name.length));
	const aliasWidth = Math.max(...all.map((e) => formatAlias(e.alias).length));

	const lines: string[] = [];
	for (const group of groups) {
		lines.push("");
		lines.push(chalk.bold.cyan(group.title));
		for (const entry of group.entries) {
			lines.push(renderRow(entry, nameWidth, aliasWidth));
		}
	}
	return lines;
}
