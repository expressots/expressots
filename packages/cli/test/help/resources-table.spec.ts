/**
 * Verifies the `resources` reference shares the grouped help styling and
 * lists every command group, the generate schematics, and the commands
 * that were previously missing (containerize, cicd, costs, migrate,
 * profile, container-dev, templates, studio, dev/build/prod).
 */

import { helpForm } from "../../src/help/form";

function captureStdout(fn: () => Promise<void>): Promise<string> {
	const chunks: string[] = [];
	const original = process.stdout.write.bind(process.stdout);
	(process.stdout.write as unknown as jest.Mock) = jest.fn(
		(chunk: string | Uint8Array) => {
			chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
			return true;
		},
	) as never;
	return fn()
		.then(() => chunks.join(""))
		.finally(() => {
			process.stdout.write = original;
		});
}

describe("resources reference", () => {
	let output: string;

	beforeAll(async () => {
		output = await captureStdout(() => helpForm());
	});

	it("renders all section headers", () => {
		expect(output).toContain("Project");
		expect(output).toContain("Generate");
		expect(output).toContain("Providers");
		expect(output).toContain("DevOps");
		expect(output).toContain("Studio & Help");
	});

	it.each([
		"new",
		"dev",
		"build",
		"prod",
		"containerize",
		"cicd",
		"migrate",
		"profile",
		"container-dev",
		"costs",
		"templates",
		"studio",
	])("lists the %s command", (command) => {
		expect(output).toContain(command);
	});

	it.each([
		"service",
		"controller",
		"usecase",
		"interceptor",
		"guard",
		"config",
	])("lists the %s schematic", (schematic) => {
		expect(output).toContain(schematic);
	});

	it("links to the documentation", () => {
		expect(output).toContain("doc.expresso-ts.com");
	});
});
