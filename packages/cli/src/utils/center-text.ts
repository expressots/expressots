function centerText(text: string): string {
	const terminalWidth = process.stdout.columns;
	const padding = Math.floor((terminalWidth - text.length) / 2);
	const centeredText = " ".repeat(padding) + text;

	return centeredText;
}

export { centerText };
