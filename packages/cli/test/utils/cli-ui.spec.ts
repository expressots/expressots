/**
 * Unit tests for the centralized CLI output helpers. We capture
 * `process.stdout.write` (and `console.log`) so we can assert on the
 * exact formatting each helper produces without polluting test output.
 */

import {
	printBullet,
	printDivider,
	printHeader,
	printKeyValue,
	printSection,
} from "../../src/utils/cli-ui";

function captureStdout(fn: () => void): string {
	const chunks: string[] = [];
	const original = process.stdout.write.bind(process.stdout);
	(process.stdout.write as unknown as jest.Mock) = jest.fn(
		(chunk: string | Uint8Array) => {
			chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
			return true;
		},
	) as never;
	try {
		fn();
	} finally {
		process.stdout.write = original;
	}
	return chunks.join("");
}

describe("printHeader", () => {
	it("includes the version when provided", () => {
		const out = captureStdout(() => printHeader("4.0.0-preview.3"));
		expect(out).toContain("ExpressoTS CLI");
		expect(out).toContain("v4.0.0-preview.3");
	});

	it("omits the version suffix when not provided", () => {
		const out = captureStdout(() => printHeader());
		expect(out).toContain("ExpressoTS CLI");
		expect(out).not.toMatch(/v\d+\.\d+\.\d+/);
	});
});

describe("structured output helpers", () => {
	it("printSection prints the title", () => {
		const out = captureStdout(() => printSection("Available Templates"));
		expect(out).toContain("Available Templates");
	});

	it("printBullet indents and prefixes the text", () => {
		const out = captureStdout(() => printBullet("an item"));
		expect(out).toContain("an item");
		expect(out).toMatch(/^ {2}/);
	});

	it("printDivider prints a horizontal rule", () => {
		const out = captureStdout(() => printDivider());
		expect(out).toContain("\u2500");
	});

	it("printKeyValue aligns key and value", () => {
		const out = captureStdout(() => printKeyValue("Source", "remote"));
		expect(out).toContain("Source:");
		expect(out).toContain("remote");
	});
});
