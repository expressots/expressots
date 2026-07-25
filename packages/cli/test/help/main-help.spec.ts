/**
 * Unit tests for top-level help rendering.
 */

import { stdout } from "process";
import { printMainHelp } from "../../src/help/main-help";

describe("help/main-help", () => {
	let writeSpy: jest.SpyInstance;

	beforeEach(() => {
		writeSpy = jest
			.spyOn(stdout, "write")
			.mockImplementation(() => true);
	});

	afterEach(() => {
		writeSpy.mockRestore();
	});

	it("writes grouped command reference to stdout", () => {
		printMainHelp("4.0.0");

		expect(writeSpy).toHaveBeenCalledTimes(1);
		const output = String(writeSpy.mock.calls[0][0]);
		expect(output).toContain("ExpressoTS CLI v4.0.0");
		expect(output).toContain("expressots <command>");
		expect(output).toContain("Project");
		expect(output).toContain("DevOps");
		expect(output).toContain("containerize");
		expect(output).toContain("expresso-ts.com");
	});

	it("omits version suffix when version is not provided", () => {
		printMainHelp();

		const output = String(writeSpy.mock.calls[0][0]);
		expect(output).toContain("ExpressoTS CLI");
		expect(output).not.toMatch(/ExpressoTS CLI v\d/);
	});
});
