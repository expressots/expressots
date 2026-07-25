/**
 * Unit tests for command help registry lookup and interception.
 */

import { stdout } from "process";
import {
	COMMAND_HELP_SPECS,
	resolveCommandHelpSpec,
	tryPrintCommandHelp,
} from "../../src/help/command-help-registry";

describe("help/command-help-registry", () => {
	let writeSpy: jest.SpyInstance;

	beforeEach(() => {
		writeSpy = jest
			.spyOn(stdout, "write")
			.mockImplementation(() => true);
	});

	afterEach(() => {
		writeSpy.mockRestore();
	});

	describe("resolveCommandHelpSpec", () => {
		it("resolves canonical command names", () => {
			expect(resolveCommandHelpSpec("costs")?.name).toBe("costs");
		});

		it("resolves aliases to the same spec", () => {
			expect(resolveCommandHelpSpec("cost")?.name).toBe("costs");
			expect(resolveCommandHelpSpec("ctr")?.name).toBe("containerize");
		});

		it("returns undefined for unknown commands", () => {
			expect(resolveCommandHelpSpec("unknown")).toBeUndefined();
		});
	});

	describe("tryPrintCommandHelp", () => {
		it("returns false when no command token is present", () => {
			expect(tryPrintCommandHelp(["--help"])).toBe(false);
			expect(writeSpy).not.toHaveBeenCalled();
		});

		it("returns false when help flag is absent", () => {
			expect(tryPrintCommandHelp(["costs", "estimate"])).toBe(false);
		});

		it("returns false for commands without a registered spec", () => {
			expect(tryPrintCommandHelp(["generate", "--help"])).toBe(false);
		});

		it("prints refined help and returns true for registered commands", () => {
			const printed = tryPrintCommandHelp(["cicd", "--help"], "4.0.0");

			expect(printed).toBe(true);
			expect(writeSpy).toHaveBeenCalled();
			const output = String(writeSpy.mock.calls[0][0]);
			expect(output).toContain("cicd");
			expect(output).toContain("CI/CD");
		});

		it("accepts -h as a help flag", () => {
			expect(tryPrintCommandHelp(["migrate", "-h"])).toBe(true);
		});
	});

	it("registers specs for all DevOps commands", () => {
		const names = new Set(COMMAND_HELP_SPECS.map((s) => s.name));
		expect(names.has("costs")).toBe(true);
		expect(names.has("cicd")).toBe(true);
		expect(names.has("migrate")).toBe(true);
		expect(names.has("profile")).toBe(true);
		expect(names.has("containerize")).toBe(true);
		expect(names.has("container-dev")).toBe(true);
		expect(names.has("templates")).toBe(true);
		expect(names.has("dev")).toBe(true);
	});
});
