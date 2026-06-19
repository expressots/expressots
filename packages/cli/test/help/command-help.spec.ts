/**
 * Unit tests for structured command help rendering.
 */

import { stdout } from "process";
import {
	helpEntry,
	printCommandHelp,
	type CommandHelpSpec,
} from "../../src/help/command-help";

describe("help/command-help", () => {
	let writeSpy: jest.SpyInstance;

	beforeEach(() => {
		writeSpy = jest
			.spyOn(stdout, "write")
			.mockImplementation(() => true);
	});

	afterEach(() => {
		writeSpy.mockRestore();
	});

	describe("helpEntry", () => {
		it("appends dim hint when provided", () => {
			const entry = helpEntry("-p, --provider", "Cloud provider", "aws, gcp");
			expect(entry.name).toBe("-p, --provider");
			expect(entry.desc).toContain("Cloud provider");
			expect(entry.desc).toContain("aws, gcp");
		});

		it("returns plain description without hint", () => {
			const entry = helpEntry("estimate", "Estimate cost");
			expect(entry.desc).toBe("Estimate cost");
		});
	});

	describe("printCommandHelp", () => {
		const spec: CommandHelpSpec = {
			name: "costs",
			aliases: ["cost"],
			usage: "expressots costs <action>",
			description: "Estimate cloud costs.",
			groups: [
				{
					title: "Actions",
					entries: [{ name: "estimate", desc: "Estimate cost" }],
				},
			],
			notes: ["Example: expressots costs estimate"],
			docs: "https://example.com/docs",
		};

		it("writes grouped help to stdout", () => {
			printCommandHelp(spec, "4.0.0");

			expect(writeSpy).toHaveBeenCalledTimes(1);
			const output = String(writeSpy.mock.calls[0][0]);
			expect(output).toContain("ExpressoTS CLI v4.0.0");
			expect(output).toContain("expressots costs <action>");
			expect(output).toContain("Estimate cloud costs.");
			expect(output).toContain("Aliases:");
			expect(output).toContain("cost");
			expect(output).toContain("Actions");
			expect(output).toContain("Example: expressots costs estimate");
			expect(output).toContain("https://example.com/docs");
		});

		it("uses default docs URL when spec.docs is omitted", () => {
			printCommandHelp({ ...spec, docs: undefined });

			const output = String(writeSpy.mock.calls[0][0]);
			expect(output).toContain("doc.expresso-ts.com");
		});
	});
});
