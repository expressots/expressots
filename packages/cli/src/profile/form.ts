import fs from "fs";
import path from "path";
import chalk from "chalk";
import {
	analyzeDockerfile,
	type DockerfileAnalysis,
} from "./analyzers/dockerfile-analyzer";
import { analyzeImage } from "./analyzers/image-analyzer";
import { generateOptimizations, applyOptimizations } from "./optimizers";
import { printSection } from "../utils/cli-ui";

export interface ProfileOptions {
	target?: string;
	dockerfile: string;
	format: "text" | "json" | "html";
	severity: "low" | "medium" | "high" | "critical";
	autoFix: boolean;
	output?: string;
	includeSecurity: boolean;
	includeSize: boolean;
}

export interface ProfileResult {
	score: number;
	issues: Issue[];
	recommendations: Recommendation[];
	metrics: Metrics;
}

export interface Issue {
	id: string;
	severity: "low" | "medium" | "high" | "critical";
	category: "security" | "size" | "performance" | "best-practice";
	message: string;
	line?: number;
	fix?: string;
}

export interface Recommendation {
	priority: "low" | "medium" | "high";
	category: string;
	title: string;
	description: string;
	impact: string;
}

export interface Metrics {
	estimatedSize?: string;
	layers?: number;
	baseImage?: string;
	nodeVersion?: string;
	hasMultiStage?: boolean;
	hasHealthCheck?: boolean;
	hasNonRootUser?: boolean;
}

/**
 * Profile a Dockerfile for issues and recommendations
 */
export async function profileContainer(options: ProfileOptions): Promise<void> {
	printSection("🔍 ExpressoTS Container Profiler");

	const cwd = process.cwd();
	const dockerfilePath = path.join(cwd, options.dockerfile);

	if (!fs.existsSync(dockerfilePath)) {
		console.log(
			chalk.red(`Error: Dockerfile not found at ${dockerfilePath}`),
		);
		console.log(
			chalk.gray(
				"Run 'expressots containerize' to generate a Dockerfile first.",
			),
		);
		return;
	}

	console.log(chalk.yellow(`📄 Analyzing ${options.dockerfile}...\n`));

	const analysis = await analyzeDockerfile(dockerfilePath);
	const result = generateProfileResult(analysis, options);

	outputResult(result, options);
}

/**
 * Profile a built Docker image
 */
export async function profileImage(options: ProfileOptions): Promise<void> {
	printSection("🔍 ExpressoTS Image Profiler");

	if (!options.target) {
		console.log(chalk.red("Error: Please specify an image name."));
		console.log(chalk.gray("Usage: expressots profile image <image-name>"));
		return;
	}

	console.log(chalk.yellow(`🐳 Analyzing image: ${options.target}...\n`));

	try {
		const analysis = await analyzeImage(options.target);

		console.log(chalk.bold("Image Analysis:"));
		console.log(`  Size: ${analysis.size}`);
		console.log(`  Layers: ${analysis.layers}`);
		console.log(`  Created: ${analysis.created}`);
		console.log(`  OS/Arch: ${analysis.os}/${analysis.architecture}`);

		if (analysis.vulnerabilities && analysis.vulnerabilities.length > 0) {
			console.log(chalk.bold("\nVulnerabilities:"));
			for (const vuln of analysis.vulnerabilities) {
				const color =
					vuln.severity === "critical"
						? chalk.red
						: vuln.severity === "high"
							? chalk.yellow
							: chalk.gray;
				console.log(
					`  ${color(`[${vuln.severity.toUpperCase()}]`)} ${vuln.id}: ${vuln.description}`,
				);
			}
		} else {
			console.log(chalk.green("\n✓ No vulnerabilities found"));
		}
	} catch (error) {
		console.log(chalk.red(`Error analyzing image: ${error}`));
		console.log(
			chalk.gray("Make sure Docker is running and the image exists."),
		);
	}
}

/**
 * Generate and optionally apply optimizations
 */
export async function optimizeContainer(
	options: ProfileOptions,
): Promise<void> {
	printSection("⚡ ExpressoTS Container Optimizer");

	const cwd = process.cwd();
	const dockerfilePath = path.join(cwd, options.dockerfile);

	if (!fs.existsSync(dockerfilePath)) {
		console.log(
			chalk.red(`Error: Dockerfile not found at ${dockerfilePath}`),
		);
		return;
	}

	const analysis = await analyzeDockerfile(dockerfilePath);
	const optimizations = generateOptimizations(analysis);

	if (optimizations.length === 0) {
		console.log(
			chalk.green(
				"✓ No optimizations needed. Your Dockerfile looks great!",
			),
		);
		return;
	}

	console.log(chalk.bold(`Found ${optimizations.length} optimization(s):\n`));

	for (const opt of optimizations) {
		const priorityColor =
			opt.priority === "high"
				? chalk.red
				: opt.priority === "medium"
					? chalk.yellow
					: chalk.gray;
		console.log(
			`  ${priorityColor(`[${opt.priority.toUpperCase()}]`)} ${opt.title}`,
		);
		console.log(chalk.gray(`    ${opt.description}`));
		console.log(chalk.green(`    Impact: ${opt.impact}`));
		console.log();
	}

	if (options.autoFix) {
		console.log(chalk.yellow("🔧 Applying safe optimizations..."));
		const applied = await applyOptimizations(dockerfilePath, optimizations);
		console.log(chalk.green(`✓ Applied ${applied} optimization(s)`));
	} else {
		console.log(
			chalk.gray(
				"Tip: Use --auto-fix to automatically apply safe optimizations",
			),
		);
	}
}

/**
 * Show a comprehensive profile report
 */
export async function showProfileReport(
	options: ProfileOptions,
): Promise<void> {
	printSection("📊 ExpressoTS Container Profile Report");

	const cwd = process.cwd();
	const dockerfilePath = path.join(cwd, options.dockerfile);

	if (!fs.existsSync(dockerfilePath)) {
		console.log(
			chalk.red(`Error: Dockerfile not found at ${dockerfilePath}`),
		);
		return;
	}

	const analysis = await analyzeDockerfile(dockerfilePath);
	const result = generateProfileResult(analysis, options);

	// Generate report based on format
	if (options.format === "json") {
		const json = JSON.stringify(result, null, 2);
		if (options.output) {
			fs.writeFileSync(options.output, json, "utf-8");
			console.log(chalk.green(`✓ Report saved to ${options.output}`));
		} else {
			console.log(json);
		}
	} else if (options.format === "html") {
		const html = generateHtmlReport(result);
		const outputPath = options.output || "container-report.html";
		fs.writeFileSync(outputPath, html, "utf-8");
		console.log(chalk.green(`✓ HTML report saved to ${outputPath}`));
	} else {
		outputResult(result, options);
	}
}

/**
 * Generate profile result from analysis
 */
function generateProfileResult(
	analysis: DockerfileAnalysis,
	options: ProfileOptions,
): ProfileResult {
	const issues: Issue[] = [];
	const recommendations: Recommendation[] = [];

	// Check for security issues
	if (!analysis.hasNonRootUser) {
		issues.push({
			id: "SEC001",
			severity: "high",
			category: "security",
			message: "Container runs as root user",
			fix: "Add 'USER node' or create a non-root user",
		});
		recommendations.push({
			priority: "high",
			category: "Security",
			title: "Add non-root user",
			description: "Running containers as root is a security risk",
			impact: "Reduces attack surface if container is compromised",
		});
	}

	if (!analysis.hasHealthCheck) {
		issues.push({
			id: "PERF001",
			severity: "medium",
			category: "performance",
			message: "No HEALTHCHECK instruction found",
			fix: "Add HEALTHCHECK instruction for orchestration support",
		});
		recommendations.push({
			priority: "medium",
			category: "Performance",
			title: "Add health check",
			description: "Health checks enable better orchestration",
			impact: "Faster failure detection and recovery",
		});
	}

	if (!analysis.hasMultiStage) {
		issues.push({
			id: "SIZE001",
			severity: "medium",
			category: "size",
			message: "Not using multi-stage build",
			fix: "Use multi-stage build to reduce final image size",
		});
		recommendations.push({
			priority: "medium",
			category: "Size",
			title: "Use multi-stage build",
			description: "Multi-stage builds reduce image size significantly",
			impact: "Can reduce image size by 50-80%",
		});
	}

	// Check for best practices
	if (analysis.hasNpmInstallWithoutCi) {
		issues.push({
			id: "BP001",
			severity: "low",
			category: "best-practice",
			message: "Using 'npm install' instead of 'npm ci'",
			fix: "Replace 'npm install' with 'npm ci' for reproducible builds",
		});
	}

	if (!analysis.hasDockerignore) {
		issues.push({
			id: "SIZE002",
			severity: "low",
			category: "size",
			message: "No .dockerignore file found",
			fix: "Create .dockerignore to exclude unnecessary files",
		});
	}

	if (analysis.hasCurlOrWgetWithoutCleanup) {
		issues.push({
			id: "SIZE003",
			severity: "low",
			category: "size",
			message: "Downloaded files may not be cleaned up",
			fix: "Clean up downloaded files in the same RUN layer",
		});
	}

	// Calculate score
	let score = 100;
	for (const issue of issues) {
		switch (issue.severity) {
			case "critical":
				score -= 25;
				break;
			case "high":
				score -= 15;
				break;
			case "medium":
				score -= 10;
				break;
			case "low":
				score -= 5;
				break;
		}
	}
	score = Math.max(0, score);

	return {
		score,
		issues: issues.filter((i) => {
			const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
			return severityOrder[i.severity] >= severityOrder[options.severity];
		}),
		recommendations,
		metrics: {
			baseImage: analysis.baseImage,
			layers: analysis.layers,
			hasMultiStage: analysis.hasMultiStage,
			hasHealthCheck: analysis.hasHealthCheck,
			hasNonRootUser: analysis.hasNonRootUser,
			nodeVersion: analysis.nodeVersion,
		},
	};
}

/**
 * Output result to console
 */
function outputResult(result: ProfileResult, options: ProfileOptions): void {
	// Score
	const scoreColor =
		result.score >= 80
			? chalk.green
			: result.score >= 60
				? chalk.yellow
				: chalk.red;
	console.log(
		chalk.bold(
			`Container Health Score: ${scoreColor(`${result.score}/100`)}\n`,
		),
	);

	// Metrics
	console.log(chalk.bold("Metrics:"));
	console.log(`  Base Image: ${result.metrics.baseImage || "Unknown"}`);
	console.log(`  Layers: ${result.metrics.layers || "Unknown"}`);
	console.log(
		`  Multi-stage: ${result.metrics.hasMultiStage ? chalk.green("✓") : chalk.red("✗")}`,
	);
	console.log(
		`  Health Check: ${result.metrics.hasHealthCheck ? chalk.green("✓") : chalk.red("✗")}`,
	);
	console.log(
		`  Non-root User: ${result.metrics.hasNonRootUser ? chalk.green("✓") : chalk.red("✗")}`,
	);

	// Issues
	if (result.issues.length > 0) {
		console.log(chalk.bold(`\nIssues (${result.issues.length}):`));
		for (const issue of result.issues) {
			const color =
				issue.severity === "critical"
					? chalk.red
					: issue.severity === "high"
						? chalk.yellow
						: issue.severity === "medium"
							? chalk.cyan
							: chalk.gray;
			console.log(
				`  ${color(`[${issue.severity.toUpperCase()}]`)} ${issue.message}`,
			);
			if (issue.fix) {
				console.log(chalk.gray(`    Fix: ${issue.fix}`));
			}
		}
	} else {
		console.log(chalk.green("\n✓ No issues found!"));
	}

	// Recommendations
	if (result.recommendations.length > 0) {
		console.log(chalk.bold(`\nRecommendations:`));
		for (const rec of result.recommendations) {
			const color = rec.priority === "high" ? chalk.yellow : chalk.gray;
			console.log(
				`  ${color(`[${rec.priority.toUpperCase()}]`)} ${rec.title}`,
			);
			console.log(chalk.gray(`    ${rec.description}`));
		}
	}

	console.log();
}

/**
 * Generate HTML report
 */
function generateHtmlReport(result: ProfileResult): string {
	const scoreColor =
		result.score >= 80
			? "#22c55e"
			: result.score >= 60
				? "#eab308"
				: "#ef4444";

	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Container Profile Report - ExpressoTS</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 2rem; }
        .container { max-width: 800px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h1 { color: #111; margin-bottom: 0.5rem; }
        h2 { color: #333; margin-bottom: 1rem; font-size: 1.25rem; }
        .score { font-size: 3rem; font-weight: bold; color: ${scoreColor}; }
        .metric { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb; }
        .issue { padding: 0.75rem; margin: 0.5rem 0; border-radius: 4px; }
        .issue.critical { background: #fef2f2; border-left: 4px solid #ef4444; }
        .issue.high { background: #fffbeb; border-left: 4px solid #f59e0b; }
        .issue.medium { background: #ecfeff; border-left: 4px solid #06b6d4; }
        .issue.low { background: #f9fafb; border-left: 4px solid #9ca3af; }
        .check { color: #22c55e; }
        .cross { color: #ef4444; }
        .footer { text-align: center; color: #6b7280; margin-top: 2rem; font-size: 0.875rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>🐳 Container Profile Report</h1>
            <p>Generated by ExpressoTS CLI</p>
        </div>
        
        <div class="card">
            <h2>Health Score</h2>
            <div class="score">${result.score}/100</div>
        </div>
        
        <div class="card">
            <h2>Metrics</h2>
            <div class="metric"><span>Base Image</span><span>${result.metrics.baseImage || "Unknown"}</span></div>
            <div class="metric"><span>Layers</span><span>${result.metrics.layers || "Unknown"}</span></div>
            <div class="metric"><span>Multi-stage Build</span><span class="${result.metrics.hasMultiStage ? "check" : "cross"}">${result.metrics.hasMultiStage ? "✓" : "✗"}</span></div>
            <div class="metric"><span>Health Check</span><span class="${result.metrics.hasHealthCheck ? "check" : "cross"}">${result.metrics.hasHealthCheck ? "✓" : "✗"}</span></div>
            <div class="metric"><span>Non-root User</span><span class="${result.metrics.hasNonRootUser ? "check" : "cross"}">${result.metrics.hasNonRootUser ? "✓" : "✗"}</span></div>
        </div>
        
        <div class="card">
            <h2>Issues (${result.issues.length})</h2>
            ${
				result.issues.length === 0
					? '<p style="color: #22c55e;">✓ No issues found!</p>'
					: result.issues
							.map(
								(i) => `
                <div class="issue ${i.severity}">
                    <strong>[${i.severity.toUpperCase()}]</strong> ${i.message}
                    ${i.fix ? `<br><small style="color: #6b7280;">Fix: ${i.fix}</small>` : ""}
                </div>
            `,
							)
							.join("")
			}
        </div>
        
        <div class="card">
            <h2>Recommendations (${result.recommendations.length})</h2>
            ${result.recommendations
				.map(
					(r) => `
                <div class="issue low">
                    <strong>${r.title}</strong><br>
                    ${r.description}<br>
                    <small style="color: #22c55e;">Impact: ${r.impact}</small>
                </div>
            `,
				)
				.join("")}
        </div>
        
        <div class="footer">
            Generated by ExpressoTS CLI • ${new Date().toISOString()}
        </div>
    </div>
</body>
</html>`;
}
