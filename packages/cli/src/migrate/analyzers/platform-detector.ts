import fs from "fs";
import path from "path";
import type { MigrationSource } from "../cli";

/**
 * Detect the current deployment platform based on configuration files
 */
export async function detectCurrentPlatform(): Promise<MigrationSource | null> {
	const cwd = process.cwd();

	// Check for platform-specific files
	const checks: { platform: MigrationSource; files: string[] }[] = [
		{ platform: "heroku", files: ["Procfile", "app.json"] },
		{ platform: "vercel", files: ["vercel.json", ".vercel"] },
		{
			platform: "docker-compose",
			files: ["docker-compose.yml", "docker-compose.yaml"],
		},
		{
			platform: "aws-ecs",
			files: ["ecs-task-definition.json", ".aws/ecs"],
		},
		{
			platform: "gcp-cloudrun",
			files: ["cloudbuild.yaml", ".gcp/cloudrun.yaml"],
		},
		{ platform: "azure-container", files: ["azure-pipelines.yml"] },
	];

	for (const check of checks) {
		for (const file of check.files) {
			if (fs.existsSync(path.join(cwd, file))) {
				return check.platform;
			}
		}
	}

	// Check for platform indicators in package.json scripts
	const packageJsonPath = path.join(cwd, "package.json");
	if (fs.existsSync(packageJsonPath)) {
		try {
			const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
			const scripts = JSON.stringify(pkg.scripts || {});

			if (scripts.includes("heroku")) return "heroku";
			if (scripts.includes("vercel")) return "vercel";
			if (scripts.includes("railway")) return "docker-compose"; // likely uses Docker
			if (scripts.includes("docker-compose")) return "docker-compose";
		} catch {
			// Ignore parse errors
		}
	}

	// If Dockerfile exists, assume docker-compose
	if (fs.existsSync(path.join(cwd, "Dockerfile"))) {
		return "docker-compose";
	}

	return null;
}

/**
 * Analyze the current platform configuration
 */
export async function analyzePlatformConfig(): Promise<{
	platform: MigrationSource | null;
	envVars: string[];
	services: string[];
	databases: string[];
}> {
	const cwd = process.cwd();
	const platform = await detectCurrentPlatform();
	const envVars: string[] = [];
	const services: string[] = [];
	const databases: string[] = [];

	// Parse .env.example for environment variables
	const envExamplePath = path.join(cwd, ".env.example");
	if (fs.existsSync(envExamplePath)) {
		const content = fs.readFileSync(envExamplePath, "utf-8");
		const lines = content.split("\n");
		for (const line of lines) {
			const match = line.match(/^([A-Z_][A-Z0-9_]*)=/);
			if (match) {
				envVars.push(match[1]);
			}
		}
	}

	// Parse docker-compose for services
	const composePath = path.join(cwd, "docker-compose.yml");
	if (fs.existsSync(composePath)) {
		const content = fs.readFileSync(composePath, "utf-8");
		const serviceMatch = content.match(/services:\n([\s\S]*?)(?=\n\w|$)/);
		if (serviceMatch) {
			const serviceLines = serviceMatch[1].match(/^\s{2}(\w+):/gm);
			if (serviceLines) {
				for (const line of serviceLines) {
					const name = line.trim().replace(":", "");
					services.push(name);

					// Check if it's a database
					if (name.includes("postgres") || name.includes("pg")) {
						databases.push("postgresql");
					} else if (name.includes("mysql")) {
						databases.push("mysql");
					} else if (name.includes("mongo")) {
						databases.push("mongodb");
					} else if (name.includes("redis")) {
						databases.push("redis");
					}
				}
			}
		}
	}

	return { platform, envVars, services, databases };
}
