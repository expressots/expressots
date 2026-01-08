import fs from "fs";
import type { DockerfileAnalysis } from "../analyzers/dockerfile-analyzer";

export interface Optimization {
	id: string;
	priority: "low" | "medium" | "high";
	category: string;
	title: string;
	description: string;
	impact: string;
	autoFixable: boolean;
	fix?: (content: string) => string;
}

/**
 * Generate optimization recommendations based on Dockerfile analysis
 */
export function generateOptimizations(
	analysis: DockerfileAnalysis,
): Optimization[] {
	const optimizations: Optimization[] = [];

	// Multi-stage build
	if (!analysis.hasMultiStage) {
		optimizations.push({
			id: "OPT001",
			priority: "high",
			category: "Size",
			title: "Use multi-stage build",
			description:
				"Multi-stage builds significantly reduce final image size by separating build and runtime dependencies.",
			impact: "Can reduce image size by 50-80%",
			autoFixable: false,
		});
	}

	// Non-root user
	if (!analysis.hasNonRootUser) {
		optimizations.push({
			id: "OPT002",
			priority: "high",
			category: "Security",
			title: "Run as non-root user",
			description:
				"Running containers as root is a security risk. Create and use a non-root user.",
			impact: "Reduces attack surface if container is compromised",
			autoFixable: false,
		});
	}

	// Health check
	if (!analysis.hasHealthCheck) {
		optimizations.push({
			id: "OPT003",
			priority: "medium",
			category: "Reliability",
			title: "Add HEALTHCHECK instruction",
			description:
				"Health checks allow orchestrators to detect and restart unhealthy containers.",
			impact: "Faster failure detection, better uptime",
			autoFixable: true,
			fix: (content) => {
				// Add health check before CMD
				const cmdMatch = content.match(/^CMD\s+.*/m);
				if (cmdMatch) {
					const healthCheck = `HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \\
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

`;
					return content.replace(
						cmdMatch[0],
						healthCheck + cmdMatch[0],
					);
				}
				return content;
			},
		});
	}

	// npm ci instead of npm install
	if (analysis.hasNpmInstallWithoutCi) {
		optimizations.push({
			id: "OPT004",
			priority: "low",
			category: "Best Practice",
			title: "Use npm ci instead of npm install",
			description:
				"npm ci provides faster, more reliable, and reproducible builds.",
			impact: "Faster builds, reproducible dependencies",
			autoFixable: true,
			fix: (content) => {
				return content.replace(/npm install(?!\s+[-\w])/g, "npm ci");
			},
		});
	}

	// .dockerignore
	if (!analysis.hasDockerignore) {
		optimizations.push({
			id: "OPT005",
			priority: "medium",
			category: "Size",
			title: "Add .dockerignore file",
			description:
				"Exclude unnecessary files from the build context to speed up builds and reduce image size.",
			impact: "Faster builds, smaller images",
			autoFixable: false,
		});
	}

	// Combine RUN commands
	if (analysis.layers > 10) {
		optimizations.push({
			id: "OPT006",
			priority: "low",
			category: "Size",
			title: "Combine RUN commands",
			description: `You have ${analysis.layers} RUN layers. Consider combining related commands to reduce layers.`,
			impact: "Slightly smaller image, faster pulls",
			autoFixable: false,
		});
	}

	// Check base image
	if (
		analysis.baseImage &&
		!analysis.baseImage.includes("alpine") &&
		!analysis.baseImage.includes("slim")
	) {
		optimizations.push({
			id: "OPT007",
			priority: "medium",
			category: "Size",
			title: "Consider using Alpine or slim base image",
			description: `Current base image: ${analysis.baseImage}. Alpine images are typically 5-10x smaller.`,
			impact: "Significantly smaller image size",
			autoFixable: false,
		});
	}

	return optimizations;
}

/**
 * Apply auto-fixable optimizations to Dockerfile
 */
export async function applyOptimizations(
	dockerfilePath: string,
	optimizations: Optimization[],
): Promise<number> {
	let content = fs.readFileSync(dockerfilePath, "utf-8");
	let appliedCount = 0;

	for (const opt of optimizations) {
		if (opt.autoFixable && opt.fix) {
			const newContent = opt.fix(content);
			if (newContent !== content) {
				content = newContent;
				appliedCount++;
			}
		}
	}

	if (appliedCount > 0) {
		fs.writeFileSync(dockerfilePath, content, "utf-8");
	}

	return appliedCount;
}
