import { execSync } from "child_process";

export interface ImageAnalysis {
	size: string;
	layers: number;
	created: string;
	os: string;
	architecture: string;
	vulnerabilities: Vulnerability[];
}

export interface Vulnerability {
	id: string;
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	package?: string;
	fixedVersion?: string;
}

/**
 * Analyze a Docker image for size, layers, and vulnerabilities
 */
export async function analyzeImage(imageName: string): Promise<ImageAnalysis> {
	// Get image inspect data
	let size = "Unknown";
	let layers = 0;
	let created = "Unknown";
	let os = "Unknown";
	let architecture = "Unknown";

	try {
		// Use double quotes for cross-platform compatibility (Windows + Unix)
		const inspectOutput = execSync(
			`docker inspect ${imageName} --format "{{.Size}} {{.Created}} {{.Os}} {{.Architecture}}"`,
			{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		).trim();

		const parts = inspectOutput.split(" ");
		const sizeBytes = parseInt(parts[0], 10);
		size = formatBytes(sizeBytes);
		created = parts[1] || "Unknown";
		os = parts[2] || "linux";
		architecture = parts[3] || "amd64";

		// Get layer count - cross-platform (count lines in Node.js instead of wc -l)
		const historyOutput = execSync(
			`docker history ${imageName} --format "{{.ID}}"`,
			{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		).trim();
		layers = historyOutput.split("\n").filter((line) => line.trim()).length;
	} catch (error) {
		// Docker command failed, image might not exist or Docker not running
		throw new Error(`Failed to inspect image: ${imageName}`);
	}

	// Try to scan for vulnerabilities using Trivy if available
	const vulnerabilities: Vulnerability[] = [];

	try {
		// Check if Trivy is available
		execSync("trivy --version", { stdio: ["pipe", "pipe", "pipe"] });

		// Run Trivy scan
		const trivyOutput = execSync(
			`trivy image --format json --severity HIGH,CRITICAL ${imageName}`,
			{
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
				maxBuffer: 50 * 1024 * 1024,
			},
		);

		const trivyResult = JSON.parse(trivyOutput);
		if (trivyResult.Results) {
			for (const result of trivyResult.Results) {
				if (result.Vulnerabilities) {
					for (const vuln of result.Vulnerabilities) {
						vulnerabilities.push({
							id: vuln.VulnerabilityID,
							severity: vuln.Severity?.toLowerCase() || "unknown",
							description:
								vuln.Title ||
								vuln.Description ||
								"No description",
							package: vuln.PkgName,
							fixedVersion: vuln.FixedVersion,
						});
					}
				}
			}
		}
	} catch {
		// Trivy not available or scan failed, skip vulnerability scanning
	}

	return {
		size,
		layers,
		created,
		os,
		architecture,
		vulnerabilities,
	};
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
