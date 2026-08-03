/**
 * Width used when stdout is not a TTY (pipes, CI logs, some editor terminals),
 * where `process.stdout.columns` is `undefined`. Matches the fallback
 * `commandOptions` already uses for yargs wrapping.
 */
const FALLBACK_WIDTH = 120;

function centerText(text: string): string {
	const terminalWidth =
		typeof process.stdout.columns === "number" && process.stdout.columns > 0
			? process.stdout.columns
			: FALLBACK_WIDTH;

	// `" ".repeat(n)` throws RangeError for negative n. That was reachable:
	// a terminal narrower than the text crashed the CLI *after* it had already
	// reported the scaffold as successful, and exited non-zero — which breaks
	// any script checking the exit status. Text wider than the terminal simply
	// cannot be centred, so return it unpadded.
	const padding = Math.max(0, Math.floor((terminalWidth - text.length) / 2));

	return " ".repeat(padding) + text;
}

export { centerText };
