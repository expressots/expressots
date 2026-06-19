/**
 * Template renderer - processes templates with variable substitution
 * Uses Mustache-like syntax: {{variable}}, {{#condition}}...{{/condition}}
 */

import type { RenderOptions } from "./types";

export class TemplateRenderer {
	/**
	 * Render template with variable substitution
	 */
	render(template: string, options: RenderOptions): string {
		let result = template;

		// Process conditionals first: {{#condition}}content{{/condition}}
		result = this.processConditionals(result, options);

		// Process negative conditionals: {{^condition}}content{{/condition}}
		result = this.processNegativeConditionals(result, options);

		// Process loops: {{#items}}{{.}}{{/items}}
		result = this.processLoops(result, options);

		// Process simple variable substitution: {{variable}}
		result = this.processVariables(result, options);

		return result;
	}

	/**
	 * Process conditional blocks {{#condition}}...{{/condition}}
	 */
	private processConditionals(
		template: string,
		options: RenderOptions,
	): string {
		const pattern = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

		return template.replace(pattern, (match, condition, content) => {
			const value =
				options.conditionals?.[condition] ??
				options.variables[condition];

			// Check if value is truthy
			if (this.isTruthy(value)) {
				// Recursively process the content
				return this.render(content, options);
			}
			return "";
		});
	}

	/**
	 * Process negative conditional blocks {{^condition}}...{{/condition}}
	 */
	private processNegativeConditionals(
		template: string,
		options: RenderOptions,
	): string {
		const pattern = /\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

		return template.replace(pattern, (match, condition, content) => {
			const value =
				options.conditionals?.[condition] ??
				options.variables[condition];

			// Check if value is falsy
			if (!this.isTruthy(value)) {
				return this.render(content, options);
			}
			return "";
		});
	}

	/**
	 * Process loop blocks for arrays
	 */
	private processLoops(template: string, options: RenderOptions): string {
		const pattern = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

		return template.replace(pattern, (match, arrayName, content) => {
			const array = options.variables[arrayName];

			if (!Array.isArray(array)) {
				return "";
			}

			return array
				.map((item, index) => {
					// Create new options with item context
					const itemOptions: RenderOptions = {
						...options,
						variables: {
							...options.variables,
							".": String(item),
							"@index": index,
							"@first": index === 0,
							"@last": index === array.length - 1,
							...(typeof item === "object" ? item : {}),
						},
					};
					return this.render(content, itemOptions);
				})
				.join("");
		});
	}

	/**
	 * Process simple variable substitution {{variable}}
	 */
	private processVariables(template: string, options: RenderOptions): string {
		// Match {{variable}} but not {{#variable}} or {{/variable}} or {{^variable}}
		const pattern = /\{\{([^#/^}][^}]*?)\}\}/g;

		return template.replace(pattern, (match, variable) => {
			const trimmedVar = variable.trim();

			// Handle dot notation for nested variables
			const value = this.getNestedValue(options.variables, trimmedVar);

			if (value === undefined || value === null) {
				// Keep the placeholder if variable not found (for debugging)
				return "";
			}

			return String(value);
		});
	}

	/**
	 * Get nested value from object using dot notation. Falls back to a
	 * flat-key lookup so callers can provide either
	 * `{ app: { version: "1.0.0" } }` or `{ "app.version": "1.0.0" }`.
	 */
	private getNestedValue(
		obj: Record<string, unknown>,
		path: string,
	): unknown {
		if (Object.prototype.hasOwnProperty.call(obj, path)) {
			return obj[path];
		}

		const parts = path.split(".");
		let current: unknown = obj;

		for (const part of parts) {
			if (current === null || current === undefined) {
				return undefined;
			}
			if (typeof current !== "object") {
				return undefined;
			}
			current = (current as Record<string, unknown>)[part];
		}

		return current;
	}

	/**
	 * Check if value is truthy for conditional evaluation
	 */
	private isTruthy(value: unknown): boolean {
		if (value === undefined || value === null) return false;
		if (typeof value === "boolean") return value;
		if (typeof value === "number") return value !== 0;
		if (typeof value === "string") return value.length > 0;
		if (Array.isArray(value)) return value.length > 0;
		if (typeof value === "object") return Object.keys(value).length > 0;
		return Boolean(value);
	}

	/**
	 * Validate template syntax
	 */
	validateTemplate(template: string): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Check for unclosed conditionals
		const openConditionals = template.match(/\{\{#(\w+)\}\}/g) || [];
		const closeConditionals = template.match(/\{\{\/(\w+)\}\}/g) || [];

		for (const open of openConditionals) {
			const name = open.match(/\{\{#(\w+)\}\}/)?.[1];
			if (name) {
				const closePattern = new RegExp(`\\{\\{\\/${name}\\}\\}`);
				if (!closePattern.test(template)) {
					errors.push(`Unclosed conditional block: {{#${name}}}`);
				}
			}
		}

		// Check for orphaned closing tags
		for (const close of closeConditionals) {
			const name = close.match(/\{\{\/(\w+)\}\}/)?.[1];
			if (name) {
				const openPattern = new RegExp(`\\{\\{[#\\^]${name}\\}\\}`);
				if (!openPattern.test(template)) {
					errors.push(`Orphaned closing tag: {{/${name}}}`);
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Extract variable names from template
	 */
	extractVariables(template: string): string[] {
		const variables = new Set<string>();

		// Match simple variables
		const simplePattern = /\{\{([^#/^}][^}]*?)\}\}/g;
		let match;
		while ((match = simplePattern.exec(template)) !== null) {
			const variable = match[1].trim();
			if (!variable.startsWith(".") && !variable.startsWith("@")) {
				variables.add(variable.split(".")[0]); // Get root variable
			}
		}

		// Match conditional variables
		const conditionalPattern = /\{\{[#^](\w+)\}\}/g;
		while ((match = conditionalPattern.exec(template)) !== null) {
			variables.add(match[1]);
		}

		return Array.from(variables);
	}
}

// Singleton instance
let rendererInstance: TemplateRenderer | null = null;

export function getTemplateRenderer(): TemplateRenderer {
	if (!rendererInstance) {
		rendererInstance = new TemplateRenderer();
	}
	return rendererInstance;
}
