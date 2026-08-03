/**
 * Deployment-target rules shared by the flags path and the interactive
 * wizard.
 *
 * These live in their own module rather than in `new/cli.ts` because that
 * module pulls in the whole scaffold pipeline (yargs, degit, inquirer) as a
 * side effect of importing `./form`. Keeping the rules import-free lets both
 * `form.ts` and the tests use them without booting the CLI.
 */

export function validateTargetTemplate(
	target?: string,
	template?: string,
): true {
	if (target === "cloudflare" && template !== "micro") {
		throw new Error(
			'The "cloudflare" target supports only the "micro" template.',
		);
	}
	return true;
}

/**
 * Whether the interactive wizard should offer a deployment-target prompt for
 * the chosen template. Mirrors `validateTargetTemplate`: only `micro` has a
 * non-Node target today, so every other template skips the question rather
 * than showing a list with one selectable entry.
 */
export function templateSupportsTargetPrompt(templateChoice: string): boolean {
	return templateChoice.startsWith("Micro");
}

/**
 * Map a wizard target choice onto the same value the `--target` flag takes.
 * Returning undefined for the Node.js choice keeps "no target" as the
 * scaffold's default path rather than a distinct code path.
 */
export function resolveTargetFromChoice(choice: string): string | undefined {
	return choice.startsWith("Cloudflare Workers") ? "cloudflare" : undefined;
}
