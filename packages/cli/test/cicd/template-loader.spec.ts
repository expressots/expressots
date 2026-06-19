/**
 * Unit tests for CI/CD template loader (remote fetch + debug logging).
 */

jest.mock("../../src/templates", () => ({
	getTemplateManager: jest.fn(),
}));

import { getTemplateManager } from "../../src/templates";
import {
	loadCICDTemplate,
	logTemplateSource,
} from "../../src/cicd/generators/template-loader";
import type { GeneratorOptions } from "../../src/cicd/generators/github-actions";

const baseOptions: GeneratorOptions = {
	projectName: "demo",
	nodeVersion: "22",
	packageManager: "npm",
	strategy: "comprehensive",
	includeSecurity: true,
	includeE2E: false,
	includeCoverage: true,
	deployTarget: "kubernetes",
	branch: "main",
	port: 3000,
	dockerRegistry: "ghcr.io/org",
};

const embedded = jest.fn(() => "embedded-content");

describe("cicd/template-loader", () => {
	beforeEach(() => {
		embedded.mockClear();
		delete process.env.EXPRESSOTS_DEBUG;
	});

	it("falls back to embedded generator when remote fetch fails", async () => {
		(getTemplateManager as jest.Mock).mockReturnValue({
			fetchCICDTemplate: jest.fn().mockRejectedValue(new Error("offline")),
			render: jest.fn(),
		});

		const result = await loadCICDTemplate(
			"github",
			"comprehensive",
			baseOptions,
			embedded,
		);

		expect(result.source).toBe("embedded");
		expect(result.content).toBe("embedded-content");
		expect(embedded).toHaveBeenCalledWith(baseOptions);
	});

	it("renders remote template when fetch succeeds", async () => {
		const render = jest.fn().mockReturnValue("remote-content");
		(getTemplateManager as jest.Mock).mockReturnValue({
			fetchCICDTemplate: jest.fn().mockResolvedValue({ data: "template-body" }),
			render,
		});

		const result = await loadCICDTemplate(
			"github",
			"comprehensive",
			baseOptions,
			embedded,
		);

		expect(result.source).toBe("remote");
		expect(result.content).toBe("remote-content");
		expect(render).toHaveBeenCalled();
		expect(embedded).not.toHaveBeenCalled();
	});

	it("logTemplateSource prints only when EXPRESSOTS_DEBUG is set", () => {
		const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

		logTemplateSource("GitHub", "embedded");
		expect(logSpy).not.toHaveBeenCalled();

		process.env.EXPRESSOTS_DEBUG = "1";
		logTemplateSource("GitHub", "remote");
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining("remote template"),
		);

		logSpy.mockRestore();
		delete process.env.EXPRESSOTS_DEBUG;
	});
});
