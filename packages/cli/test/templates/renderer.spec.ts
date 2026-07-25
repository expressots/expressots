/**
 * Template Renderer Tests
 */

import { TemplateRenderer } from "../../src/templates/renderer";

describe("TemplateRenderer", () => {
	let renderer: TemplateRenderer;

	beforeEach(() => {
		renderer = new TemplateRenderer();
	});

	describe("Variable Substitution", () => {
		it("should substitute simple variables", () => {
			const template = "Hello {{name}}!";
			const result = renderer.render(template, {
				variables: { name: "World" },
			});
			expect(result).toBe("Hello World!");
		});

		it("should handle multiple variables", () => {
			const template = "{{greeting}} {{name}}! You are {{age}} years old.";
			const result = renderer.render(template, {
				variables: { greeting: "Hi", name: "John", age: 30 },
			});
			expect(result).toBe("Hi John! You are 30 years old.");
		});

		it("should handle missing variables gracefully", () => {
			const template = "Hello {{name}}!";
			const result = renderer.render(template, {
				variables: {},
			});
			expect(result).toBe("Hello !");
		});

		it("should handle nested variables", () => {
			const template = "Version: {{app.version}}";
			const result = renderer.render(template, {
				variables: { "app.version": "1.0.0" },
			});
			expect(result).toBe("Version: 1.0.0");
		});
	});

	describe("Conditionals", () => {
		it("should show content when condition is true", () => {
			const template = "{{#showGreeting}}Hello!{{/showGreeting}}";
			const result = renderer.render(template, {
				variables: { showGreeting: true },
			});
			expect(result).toBe("Hello!");
		});

		it("should hide content when condition is false", () => {
			const template = "{{#showGreeting}}Hello!{{/showGreeting}}";
			const result = renderer.render(template, {
				variables: { showGreeting: false },
			});
			expect(result).toBe("");
		});

		it("should handle negative conditionals", () => {
			const template = "{{^isProduction}}Development Mode{{/isProduction}}";
			const result = renderer.render(template, {
				variables: { isProduction: false },
			});
			expect(result).toBe("Development Mode");
		});

		it("should handle conditional with nested content", () => {
			const template = "{{#includeSecurity}}Security: Enabled\nTrivy: Active{{/includeSecurity}}";
			const result = renderer.render(template, {
				variables: { includeSecurity: true },
			});
			expect(result).toContain("Security: Enabled");
			expect(result).toContain("Trivy: Active");
		});
	});

	describe("Template Validation", () => {
		it("should validate correct template", () => {
			const template = "{{#condition}}content{{/condition}}";
			const result = renderer.validateTemplate(template);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect unclosed conditionals", () => {
			const template = "{{#condition}}content";
			const result = renderer.validateTemplate(template);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should detect orphaned closing tags", () => {
			const template = "content{{/condition}}";
			const result = renderer.validateTemplate(template);
			expect(result.valid).toBe(false);
		});
	});

	describe("Variable Extraction", () => {
		it("should extract simple variables", () => {
			const template = "Hello {{name}}, you have {{count}} messages.";
			const variables = renderer.extractVariables(template);
			expect(variables).toContain("name");
			expect(variables).toContain("count");
		});

		it("should extract conditional variables", () => {
			const template = "{{#showDetails}}Details{{/showDetails}}";
			const variables = renderer.extractVariables(template);
			expect(variables).toContain("showDetails");
		});
	});
});
