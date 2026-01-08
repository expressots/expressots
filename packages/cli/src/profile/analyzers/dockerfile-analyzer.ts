import fs from "fs";
import path from "path";

export interface DockerfileAnalysis {
	baseImage?: string;
	nodeVersion?: string;
	layers: number;
	hasMultiStage: boolean;
	hasHealthCheck: boolean;
	hasNonRootUser: boolean;
	hasDockerignore: boolean;
	hasNpmInstallWithoutCi: boolean;
	hasCurlOrWgetWithoutCleanup: boolean;
	instructions: DockerInstruction[];
	stages: string[];
}

export interface DockerInstruction {
	line: number;
	instruction: string;
	arguments: string;
	raw: string;
}

/**
 * Analyze a Dockerfile for issues and metrics
 */
export async function analyzeDockerfile(dockerfilePath: string): Promise<DockerfileAnalysis> {
	const content = fs.readFileSync(dockerfilePath, "utf-8");
	const lines = content.split("\n");
	const instructions: DockerInstruction[] = [];
	const stages: string[] = [];
	
	let hasMultiStage = false;
	let hasHealthCheck = false;
	let hasNonRootUser = false;
	let hasNpmInstallWithoutCi = false;
	let hasCurlOrWgetWithoutCleanup = false;
	let baseImage: string | undefined;
	let nodeVersion: string | undefined;
	let runLayerCount = 0;

	// Parse Dockerfile
	let currentLine = 0;
	for (const line of lines) {
		currentLine++;
		const trimmed = line.trim();
		
		// Skip comments and empty lines
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		// Parse instruction
		const match = trimmed.match(/^(\w+)\s*(.*)/);
		if (!match) continue;

		const instruction = match[1].toUpperCase();
		const args = match[2];

		instructions.push({
			line: currentLine,
			instruction,
			arguments: args,
			raw: trimmed,
		});

		// Analyze instruction
		switch (instruction) {
			case "FROM":
				if (stages.length > 0) {
					hasMultiStage = true;
				}
				stages.push(args);
				
				// Extract base image info
				if (!baseImage) {
					baseImage = args.split(/\s+/)[0];
					
					// Try to extract Node version
					const nodeMatch = baseImage.match(/node:(\d+)/);
					if (nodeMatch) {
						nodeVersion = nodeMatch[1];
					}
				}
				break;

			case "HEALTHCHECK":
				hasHealthCheck = true;
				break;

			case "USER":
				// Check if non-root user
				if (args && args !== "root" && args !== "0") {
					hasNonRootUser = true;
				}
				break;

			case "RUN":
				runLayerCount++;
				
				// Check for npm install vs npm ci
				if (args.includes("npm install") && !args.includes("npm ci")) {
					hasNpmInstallWithoutCi = true;
				}
				
				// Check for curl/wget without cleanup
				if ((args.includes("curl") || args.includes("wget")) &&
					!args.includes("rm ")) {
					hasCurlOrWgetWithoutCleanup = true;
				}
				break;
		}
	}

	// Check for .dockerignore
	const dockerignorePath = path.join(path.dirname(dockerfilePath), ".dockerignore");
	const hasDockerignore = fs.existsSync(dockerignorePath);

	return {
		baseImage,
		nodeVersion,
		layers: runLayerCount,
		hasMultiStage,
		hasHealthCheck,
		hasNonRootUser,
		hasDockerignore,
		hasNpmInstallWithoutCi,
		hasCurlOrWgetWithoutCleanup,
		instructions,
		stages,
	};
}

/**
 * Parse a specific Dockerfile instruction
 */
export function parseInstruction(line: string): DockerInstruction | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#")) {
		return null;
	}

	const match = trimmed.match(/^(\w+)\s*(.*)/);
	if (!match) return null;

	return {
		line: 0,
		instruction: match[1].toUpperCase(),
		arguments: match[2],
		raw: trimmed,
	};
}
