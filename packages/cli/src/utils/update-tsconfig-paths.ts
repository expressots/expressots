import fs from "node:fs";
import path from "node:path";
import { printInfo, printWarning } from "./cli-ui";

/**
 * Default path alias mappings for opinionated scaffolding
 * Maps folder names to their corresponding path aliases
 */
const DEFAULT_PATH_ALIASES: Record<string, string> = {
	controllers: "@controllers",
	useCases: "@useCases",
	providers: "@providers",
	entities: "@entities",
	middleware: "@middleware",
	interceptors: "@interceptors",
	events: "@events",
	guards: "@guards",
	config: "@config",
};

/**
 * Generate path alias from folder name
 * Handles both default mappings and custom folder names
 *
 * @param folderName - The folder name (e.g., "useCases", "my-custom-folder")
 * @returns The path alias (e.g., "@useCases", "@myCustomFolder")
 */
export function generatePathAlias(folderName: string): string {
	// Check if we have a default mapping
	if (DEFAULT_PATH_ALIASES[folderName]) {
		return DEFAULT_PATH_ALIASES[folderName];
	}

	// For custom folder names, convert to camelCase and add @ prefix
	// Handles: kebab-case, snake_case, PascalCase, camelCase
	const camelCase = folderName
		.split(/[-_]/)
		.map((word, index) => {
			if (index === 0) {
				// First word: keep original case for already camelCase names
				return word.charAt(0).toLowerCase() + word.slice(1);
			}
			// Subsequent words: capitalize first letter
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join("");

	return `@${camelCase}`;
}

/**
 * Parse JSONC (JSON with Comments) by stripping comments and trailing commas
 * Handles:
 * - Single-line comments (//)
 * - Multi-line comments
 * - Trailing commas (common in tsconfig.json)
 *
 * @param content - The JSONC content
 * @returns Cleaned JSON string that can be parsed by JSON.parse
 */
function stripJsonComments(content: string): string {
	let result = content;

	// Remove multi-line comments first (they can span multiple lines)
	result = result.replace(/\/\*[\s\S]*?\*\//g, "");

	// Remove single-line comments (but not inside strings)
	// This regex looks for // that are not inside strings
	result = result.replace(/^(\s*)\/\/.*$/gm, "$1");

	// Also handle inline comments after values
	// Match: value, // comment or value // comment
	result = result.replace(/,\s*\/\/.*$/gm, ",");
	result = result.replace(/(["\d\w\]}\s])\s*\/\/.*$/gm, "$1");

	// Remove trailing commas before } or ]
	// This handles cases like: { "key": "value", }
	result = result.replace(/,(\s*[}\]])/g, "$1");

	return result;
}

/**
 * Try to parse JSONC content, first stripping comments then parsing
 * @param content - Raw file content
 * @returns Parsed config object or null if parsing fails
 */
function parseJsonc(content: string): Record<string, unknown> | null {
	// Always try to strip comments first for consistency
	const stripped = stripJsonComments(content);

	try {
		return JSON.parse(stripped);
	} catch {
		// If stripping didn't help, try the original (unlikely but safe)
		try {
			return JSON.parse(content);
		} catch {
			return null;
		}
	}
}

/**
 * Text-based fallback to add path alias when JSON parsing fails
 * This preserves the original file format (comments, etc.)
 *
 * @param content - Original file content
 * @param aliasKey - The path alias key (e.g., "@config/*")
 * @param aliasValue - The path alias value (e.g., ["./src/config/*"])
 * @returns Modified content or null if update failed
 */
function addPathAliasTextBased(
	content: string,
	aliasKey: string,
	aliasValue: string[],
): string | null {
	// Check if the alias already exists
	if (content.includes(`"${aliasKey}"`)) {
		return null; // Already exists, no update needed
	}

	// Find the "paths" object
	const pathsMatch = content.match(/"paths"\s*:\s*\{/);
	if (pathsMatch && pathsMatch.index !== undefined) {
		// Insert new path alias after "paths": {
		const insertPos = pathsMatch.index + pathsMatch[0].length;
		const aliasEntry = `\n\t\t\t"${aliasKey}": ${JSON.stringify(aliasValue)},`;
		return (
			content.slice(0, insertPos) + aliasEntry + content.slice(insertPos)
		);
	}

	// Find compilerOptions to add paths object
	const compilerOptionsMatch = content.match(/"compilerOptions"\s*:\s*\{/);
	if (compilerOptionsMatch && compilerOptionsMatch.index !== undefined) {
		// Check if baseUrl exists
		const hasBaseUrl = /"baseUrl"\s*:/.test(content);

		// Find the end of compilerOptions opening brace
		const insertPos =
			compilerOptionsMatch.index + compilerOptionsMatch[0].length;

		let insertion = "\n";
		if (!hasBaseUrl) {
			insertion += '\t\t"baseUrl": ".",\n';
		}
		insertion += `\t\t"paths": {\n\t\t\t"${aliasKey}": ${JSON.stringify(aliasValue)}\n\t\t},`;

		return (
			content.slice(0, insertPos) + insertion + content.slice(insertPos)
		);
	}

	// Can't find compilerOptions, give up
	return null;
}

/**
 * Update tsconfig.json paths to include missing aliases for opinionated scaffolding
 * Handles both default folders and custom scaffoldSchematics overrides
 *
 * @param folderName - The folder name where the schematic is being created
 * @param sourceRoot - The source root directory (default: "src")
 */
export async function updateTsconfigPaths(
	folderName: string,
	sourceRoot: string = "src",
): Promise<void> {
	if (!folderName) {
		return; // No folder specified
	}

	const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
	const tsconfigBuildPath = path.join(process.cwd(), "tsconfig.build.json");

	// Generate alias from folder name (handles custom names)
	const alias = generatePathAlias(folderName);
	const aliasKey = `${alias}/*`;

	// Track if we updated any config
	let updated = false;

	// Update both tsconfig files if they exist
	for (const configPath of [tsconfigPath, tsconfigBuildPath]) {
		if (!fs.existsSync(configPath)) {
			continue;
		}

		try {
			const configContent = fs.readFileSync(configPath, "utf-8");

			// Try JSON parsing first
			const config = parseJsonc(configContent);

			if (config) {
				// JSON parsing succeeded - use structured approach
				// Ensure compilerOptions exists
				if (!config.compilerOptions) {
					config.compilerOptions = {};
				}

				const compilerOptions = config.compilerOptions as Record<
					string,
					unknown
				>;

				// Ensure baseUrl is set (required for paths to work)
				if (!compilerOptions.baseUrl) {
					compilerOptions.baseUrl = ".";
				}

				// Determine the correct path value based on baseUrl
				// If baseUrl is "./src" or "src", paths should be relative to src
				// If baseUrl is ".", paths should include the full path from root
				const baseUrl = (compilerOptions.baseUrl as string) || ".";
				const isBaseUrlSrc =
					baseUrl === `./${sourceRoot}` || baseUrl === sourceRoot;
				const aliasValue = isBaseUrlSrc
					? [`./${folderName}/*`]
					: [`./${sourceRoot}/${folderName}/*`];

				// Ensure paths object exists
				if (!compilerOptions.paths) {
					compilerOptions.paths = {};
				}

				const paths = compilerOptions.paths as Record<string, string[]>;

				// Only add if it doesn't exist
				if (!paths[aliasKey]) {
					paths[aliasKey] = aliasValue;

					// Write back to file with proper formatting (tab indent)
					fs.writeFileSync(
						configPath,
						JSON.stringify(config, null, "\t") + "\n",
						"utf-8",
					);

					updated = true;
				}
			} else {
				// JSON parsing failed - use text-based fallback
				// This preserves comments and formatting
				// Try to detect baseUrl from content
				const baseUrlMatch = configContent.match(
					/"baseUrl"\s*:\s*"([^"]+)"/,
				);
				const baseUrl = baseUrlMatch ? baseUrlMatch[1] : ".";
				const isBaseUrlSrc =
					baseUrl === `./${sourceRoot}` || baseUrl === sourceRoot;
				const aliasValue = isBaseUrlSrc
					? [`./${folderName}/*`]
					: [`./${sourceRoot}/${folderName}/*`];

				const modifiedContent = addPathAliasTextBased(
					configContent,
					aliasKey,
					aliasValue,
				);

				if (modifiedContent) {
					fs.writeFileSync(configPath, modifiedContent, "utf-8");
					updated = true;
				} else if (!configContent.includes(`"${aliasKey}"`)) {
					// Couldn't update and alias doesn't exist
					printWarning(
						`Could not update ${path.basename(configPath)}. Please add "${aliasKey}" path alias manually`,
						"tsconfig",
					);
				}
			}
		} catch (error) {
			// Log warning but don't fail the scaffolding process
			printWarning(
				`Could not update ${path.basename(configPath)}: ${error instanceof Error ? error.message : "Unknown error"}`,
				"tsconfig",
			);
		}
	}

	// Print success message only if we updated something
	if (updated) {
		printInfo(`Path alias ${aliasKey} added`, "tsconfig");
	}
}

/**
 * Get the path alias for a given folder name
 * Used by other utilities to determine the correct import path
 *
 * @param folderName - The folder name
 * @returns The path alias (e.g., "@useCases")
 */
export function getPathAliasForFolder(folderName: string): string {
	return generatePathAlias(folderName);
}

/**
 * Check if tsconfig already has all required path aliases for opinionated mode
 * This can be used to validate project setup
 *
 * @param requiredFolders - List of folder names that need path aliases
 * @returns Object with missing aliases and whether all are present
 */
export function validateTsconfigPaths(requiredFolders: string[]): {
	valid: boolean;
	missingAliases: string[];
} {
	const tsconfigPath = path.join(process.cwd(), "tsconfig.json");

	if (!fs.existsSync(tsconfigPath)) {
		return {
			valid: false,
			missingAliases: requiredFolders.map((f) => generatePathAlias(f)),
		};
	}

	try {
		const configContent = fs.readFileSync(tsconfigPath, "utf-8");
		let config: Record<string, unknown>;
		try {
			config = JSON.parse(configContent);
		} catch {
			config = JSON.parse(stripJsonComments(configContent));
		}

		const paths =
			((config.compilerOptions as Record<string, unknown>)
				?.paths as Record<string, string[]>) || {};

		const missingAliases: string[] = [];
		for (const folder of requiredFolders) {
			const aliasKey = `${generatePathAlias(folder)}/*`;
			if (!paths[aliasKey]) {
				missingAliases.push(aliasKey);
			}
		}

		return {
			valid: missingAliases.length === 0,
			missingAliases,
		};
	} catch {
		return {
			valid: false,
			missingAliases: requiredFolders.map((f) => generatePathAlias(f)),
		};
	}
}
