import fs from "fs";
import path from "path";

/**
 * Environment file mapping from bootstrap configuration
 */
export interface EnvFileMapping {
	[environment: string]: string;
}

/**
 * Bootstrap configuration detected from main.ts
 */
export interface BootstrapConfig {
	/** Whether envFileConfig is used */
	hasEnvFileConfig: boolean;
	/** Whether skipFileLoading is set to true (container-friendly) */
	skipFileLoading: boolean;
	/** Whether ciMode is explicitly set */
	ciMode: boolean | undefined;
	/** Environment file mappings */
	envFiles: EnvFileMapping;
	/** Required environment variables */
	requiredVariables: string[];
	/** Whether autoCreateTemplate is enabled */
	autoCreateTemplate: boolean;
	/** Current environment if specified */
	currentEnvironment: string | undefined;
	/** Detected env files that exist on disk */
	existingEnvFiles: string[];
	/** Detected env files that are missing */
	missingEnvFiles: string[];
	/** Whether the configuration is container-ready */
	isContainerReady: boolean;
	/** Recommendations for container deployment */
	recommendations: string[];
}

/**
 * Analyze the bootstrap configuration in main.ts
 * Detects environment file configurations that affect container deployment
 */
export async function analyzeBootstrapConfig(): Promise<BootstrapConfig> {
	const cwd = process.cwd();
	const result: BootstrapConfig = {
		hasEnvFileConfig: false,
		skipFileLoading: false,
		ciMode: undefined,
		envFiles: {},
		requiredVariables: [],
		autoCreateTemplate: false,
		currentEnvironment: undefined,
		existingEnvFiles: [],
		missingEnvFiles: [],
		isContainerReady: true,
		recommendations: [],
	};

	// Find main.ts file
	const mainTsPath = findMainFile(cwd);
	if (!mainTsPath) {
		return result;
	}

	const content = fs.readFileSync(mainTsPath, "utf-8");

	// Check if bootstrap is imported and used
	if (!content.includes("bootstrap")) {
		return result;
	}

	// Parse bootstrap configuration
	parseBootstrapConfig(content, result);

	// Detect existing env files
	detectExistingEnvFiles(cwd, result);

	// Determine if configuration is container-ready
	evaluateContainerReadiness(result);

	return result;
}

/**
 * Find the main.ts file in the project
 */
function findMainFile(cwd: string): string | null {
	const possiblePaths = [
		path.join(cwd, "src", "main.ts"),
		path.join(cwd, "src", "index.ts"),
		path.join(cwd, "main.ts"),
		path.join(cwd, "index.ts"),
	];

	for (const filePath of possiblePaths) {
		if (fs.existsSync(filePath)) {
			return filePath;
		}
	}

	return null;
}

/**
 * Parse bootstrap configuration from file content
 * Uses regex patterns to extract configuration without full AST parsing
 */
function parseBootstrapConfig(content: string, result: BootstrapConfig): void {
	// Check for envFileConfig usage
	const envFileConfigMatch = content.match(/envFileConfig\s*[:{]/);
	if (envFileConfigMatch) {
		result.hasEnvFileConfig = true;
	}

	// Check for skipFileLoading: true
	if (/skipFileLoading\s*:\s*true/.test(content)) {
		result.skipFileLoading = true;
	}

	// Check for ciMode
	const ciModeMatch = content.match(/ciMode\s*:\s*(true|false)/);
	if (ciModeMatch) {
		result.ciMode = ciModeMatch[1] === "true";
	}

	// Check for autoCreateTemplate
	if (/autoCreateTemplate\s*:\s*true/.test(content)) {
		result.autoCreateTemplate = true;
	}

	// Extract files mapping
	const filesMatch = content.match(
		/files\s*:\s*\{([^}]+)\}/s,
	);
	if (filesMatch) {
		const filesContent = filesMatch[1];
		// Match key-value pairs like: development: ".env.dev"
		const envMappings = filesContent.matchAll(
			/(\w+)\s*:\s*["'`]([^"'`]+)["'`]/g,
		);
		for (const match of envMappings) {
			result.envFiles[match[1]] = match[2];
		}
	}

	// Extract required variables
	const requiredMatch = content.match(
		/required\s*:\s*\[([^\]]+)\]/s,
	);
	if (requiredMatch) {
		const requiredContent = requiredMatch[1];
		const variables = requiredContent.matchAll(/["'`]([^"'`]+)["'`]/g);
		for (const match of variables) {
			result.requiredVariables.push(match[1]);
		}
	}

	// Extract currentEnvironment
	const envMatch = content.match(
		/currentEnvironment\s*:\s*["'`]([^"'`]+)["'`]/,
	);
	if (envMatch) {
		result.currentEnvironment = envMatch[1];
	}
}

/**
 * Detect which env files exist and which are missing
 */
function detectExistingEnvFiles(cwd: string, result: BootstrapConfig): void {
	// If no explicit files mapping, use convention
	if (Object.keys(result.envFiles).length === 0 && result.hasEnvFileConfig) {
		// Default convention: .env.{environment}
		const defaultEnvs = ["development", "production", "staging", "test"];
		for (const env of defaultEnvs) {
			result.envFiles[env] = `.env.${env}`;
		}
	}

	// Check each mapped file
	for (const [env, fileName] of Object.entries(result.envFiles)) {
		const filePath = path.join(cwd, fileName);
		if (fs.existsSync(filePath)) {
			result.existingEnvFiles.push(fileName);
		} else {
			result.missingEnvFiles.push(fileName);
		}
	}

	// Also check for common env files
	const commonEnvFiles = [".env", ".env.local", ".env.example"];
	for (const fileName of commonEnvFiles) {
		const filePath = path.join(cwd, fileName);
		if (
			fs.existsSync(filePath) &&
			!result.existingEnvFiles.includes(fileName)
		) {
			result.existingEnvFiles.push(fileName);
		}
	}
}

/**
 * Evaluate if the bootstrap configuration is container-ready
 */
function evaluateContainerReadiness(result: BootstrapConfig): void {
	result.isContainerReady = true;
	result.recommendations = [];

	// If envFileConfig is used but skipFileLoading is not true
	if (result.hasEnvFileConfig && !result.skipFileLoading && !result.ciMode) {
		// Check if there are missing env files for development
		const devEnvFile = result.envFiles["development"] || ".env.development";
		if (result.missingEnvFiles.includes(devEnvFile)) {
			result.isContainerReady = false;
			result.recommendations.push(
				`Create ${devEnvFile} or set skipFileLoading: true for containers`,
			);
		}

		// Recommend container-friendly configuration
		if (!result.skipFileLoading) {
			result.recommendations.push(
				"Consider using skipFileLoading: true for Docker deployments",
			);
			result.recommendations.push(
				"Use docker-compose environment variables instead of .env files",
			);
		}
	}

	// If there are required variables, they need to be provided
	if (result.requiredVariables.length > 0) {
		result.recommendations.push(
			`Ensure these variables are set in docker-compose: ${result.requiredVariables.join(", ")}`,
		);
	}
}

/**
 * Get the env file for a specific environment
 */
export function getEnvFileForEnvironment(
	config: BootstrapConfig,
	environment: string,
): string {
	return config.envFiles[environment] || `.env.${environment}`;
}

/**
 * Check if env files should be copied to the container
 */
export function shouldCopyEnvFiles(config: BootstrapConfig): boolean {
	// Don't copy if skipFileLoading is true or ciMode is true
	if (config.skipFileLoading || config.ciMode) {
		return false;
	}

	// Copy if envFileConfig is used and there are existing files
	return config.hasEnvFileConfig && config.existingEnvFiles.length > 0;
}
