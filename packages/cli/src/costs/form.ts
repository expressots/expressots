import fs from "fs";
import chalk from "chalk";
import type { CloudProvider } from "./cli";
import { analyzeProject } from "../containerize/analyzers/project-analyzer";
import { getPricing, type ProviderPricing } from "./providers";
import { getPricingManager } from "./pricing-manager";

export interface CostOptions {
	provider?: CloudProvider;
	service?: string;
	instances: number;
	cpu: number;
	memory: number;
	storage: number;
	bandwidth: number;
	region: string;
	hours: number;
	format: "text" | "json" | "markdown";
	output?: string;
}

export interface CostEstimate {
	provider: string;
	service: string;
	monthlyCost: number;
	breakdown: CostBreakdown;
	currency: string;
}

export interface CostBreakdown {
	compute: number;
	memory?: number;
	storage: number;
	bandwidth: number;
	other: number;
}

const PROVIDERS: CloudProvider[] = [
	"aws",
	"gcp",
	"azure",
	"railway",
	"render",
	"fly",
	"digitalocean",
	"heroku",
];

/**
 * Estimate costs for a specific provider
 */
export async function estimateCosts(options: CostOptions): Promise<void> {
	console.log(chalk.cyan("\n💰 ExpressoTS Cost Estimator\n"));

	// Analyze project for resource estimates
	const analysis = await analyzeProject();

	// Use project analysis to suggest resources if not specified
	// Parse estimated values from analysis (e.g., "256Mi" -> 0.25)
	const parseMemory = (mem: string | undefined): number => {
		if (!mem) return 1;
		const match = mem.match(/(\d+)/);
		if (!match) return 1;
		const value = parseInt(match[1], 10);
		if (mem.includes("Mi")) return value / 1024;
		if (mem.includes("Gi")) return value;
		return value / 1024; // Assume MiB
	};

	const parseCpu = (cpu: string | undefined): number => {
		if (!cpu) return 1;
		const match = cpu.match(/(\d+)/);
		if (!match) return 1;
		const value = parseInt(match[1], 10);
		if (cpu.includes("m")) return value / 1000;
		return value;
	};

	const resources = {
		instances: options.instances,
		cpu: options.cpu || parseCpu(analysis?.estimatedCpu) || 1,
		memory: options.memory || parseMemory(analysis?.estimatedMemory) || 1,
		storage: options.storage,
		bandwidth: options.bandwidth,
		hours: options.hours,
	};

	console.log(chalk.bold("Resource Configuration:"));
	console.log(`  Instances: ${resources.instances}`);
	console.log(`  CPU: ${resources.cpu} vCPU`);
	console.log(`  Memory: ${resources.memory} GB`);
	console.log(`  Storage: ${resources.storage} GB`);
	console.log(`  Bandwidth: ${resources.bandwidth} GB/month`);
	console.log(`  Running Hours: ${resources.hours}/month`);
	console.log();

	if (options.provider) {
		// Estimate for specific provider
		const estimate = calculateEstimate(
			options.provider,
			resources,
			options,
		);
		printEstimate(estimate, options);
	} else {
		// Show all providers for comparison
		await compareCosts(options);
	}
}

/**
 * Compare costs across all providers
 */
export async function compareCosts(options: CostOptions): Promise<void> {
	console.log(chalk.cyan("\n📊 Cost Comparison Across Providers\n"));

	const resources = {
		instances: options.instances,
		cpu: options.cpu,
		memory: options.memory,
		storage: options.storage,
		bandwidth: options.bandwidth,
		hours: options.hours,
	};

	const estimates: CostEstimate[] = [];

	for (const provider of PROVIDERS) {
		const estimate = calculateEstimate(provider, resources, options);
		estimates.push(estimate);
	}

	// Sort by cost
	estimates.sort((a, b) => a.monthlyCost - b.monthlyCost);

	if (options.format === "json") {
		const json = JSON.stringify(estimates, null, 2);
		if (options.output) {
			fs.writeFileSync(options.output, json, "utf-8");
			console.log(chalk.green(`✓ Saved to ${options.output}`));
		} else {
			console.log(json);
		}
		return;
	}

	if (options.format === "markdown") {
		const markdown = generateMarkdownReport(estimates, resources);
		if (options.output) {
			fs.writeFileSync(options.output, markdown, "utf-8");
			console.log(chalk.green(`✓ Saved to ${options.output}`));
		} else {
			console.log(markdown);
		}
		return;
	}

	// Text format
	console.log(chalk.bold("Monthly Cost Estimates:"));
	console.log("-".repeat(60));
	console.log(
		"Provider".padEnd(20) +
			"Service".padEnd(15) +
			"Monthly Cost".padEnd(15) +
			"Rank",
	);
	console.log("-".repeat(60));

	let rank = 1;
	const cheapest = estimates[0].monthlyCost;

	for (const est of estimates) {
		const costDiff = est.monthlyCost - cheapest;
		const diffStr =
			costDiff > 0
				? chalk.gray(`+$${costDiff.toFixed(2)}`)
				: chalk.green("Best");

		const providerColor =
			rank === 1 ? chalk.green : rank <= 3 ? chalk.yellow : chalk.white;

		console.log(
			providerColor(est.provider.padEnd(20)) +
				est.service.padEnd(15) +
				chalk.cyan(`$${est.monthlyCost.toFixed(2)}`.padEnd(15)) +
				diffStr,
		);
		rank++;
	}

	console.log("-".repeat(60));
	console.log();

	// Show recommendations
	console.log(chalk.bold("💡 Recommendations:"));
	console.log(
		`  Cheapest: ${chalk.green(estimates[0].provider)} at $${estimates[0].monthlyCost.toFixed(2)}/month`,
	);

	if (estimates.length > 1) {
		const savingsVsHeroku = estimates.find((e) => e.provider === "heroku");
		if (savingsVsHeroku && savingsVsHeroku.monthlyCost > cheapest) {
			const savings = savingsVsHeroku.monthlyCost - cheapest;
			console.log(
				`  Save ${chalk.yellow(`$${savings.toFixed(2)}/month`)} vs Heroku by switching to ${estimates[0].provider}`,
			);
		}
	}

	// PaaS vs Cloud recommendation
	const paasProviders = ["railway", "render", "fly", "heroku"];
	const cloudProviders = ["aws", "gcp", "azure"];

	const cheapestPaaS = estimates.find((e) =>
		paasProviders.includes(e.provider),
	);
	const cheapestCloud = estimates.find((e) =>
		cloudProviders.includes(e.provider),
	);

	if (cheapestPaaS && cheapestCloud) {
		if (cheapestPaaS.monthlyCost < cheapestCloud.monthlyCost) {
			console.log(
				`  For simplicity: Use ${chalk.cyan(cheapestPaaS.provider)} (PaaS)`,
			);
		} else {
			console.log(
				`  For control: Use ${chalk.cyan(cheapestCloud.provider)} (IaaS) - ${chalk.gray("requires more setup")}`,
			);
		}
	}

	console.log();
}

/**
 * Suggest cost optimizations
 */
export async function optimizeCosts(options: CostOptions): Promise<void> {
	console.log(chalk.cyan("\n⚡ Cost Optimization Suggestions\n"));

	const analysis = await analyzeProject();
	const recommendations: {
		priority: string;
		title: string;
		savings: string;
		description: string;
	}[] = [];

	// Check current resource usage
	if (options.cpu > 1 && options.memory <= 2) {
		recommendations.push({
			priority: "HIGH",
			title: "Right-size CPU allocation",
			savings: "20-40%",
			description:
				"Your memory is low compared to CPU. Consider a smaller instance type.",
		});
	}

	if (options.instances > 1 && options.hours < 720) {
		recommendations.push({
			priority: "HIGH",
			title: "Use auto-scaling",
			savings: "30-50%",
			description:
				"With variable hours, auto-scaling can reduce costs during low-traffic periods.",
		});
	}

	if (options.storage > 50) {
		recommendations.push({
			priority: "MEDIUM",
			title: "Optimize storage",
			savings: "10-20%",
			description:
				"Consider using object storage (S3/GCS) for static files instead of block storage.",
		});
	}

	// Provider-specific recommendations
	if (options.provider === "heroku") {
		recommendations.push({
			priority: "HIGH",
			title: "Migrate from Heroku",
			savings: "40-60%",
			description:
				"Railway, Render, or Fly.io offer similar DX at lower prices.",
		});
	}

	// General recommendations
	recommendations.push({
		priority: "MEDIUM",
		title: "Use reserved/committed instances",
		savings: "20-40%",
		description:
			"If your workload is predictable, commit to 1-3 year reserved instances.",
	});

	recommendations.push({
		priority: "LOW",
		title: "Enable spot/preemptible instances",
		savings: "50-80%",
		description:
			"For fault-tolerant workloads, use spot instances for significant savings.",
	});

	// Print recommendations
	for (const rec of recommendations) {
		const color =
			rec.priority === "HIGH"
				? chalk.red
				: rec.priority === "MEDIUM"
					? chalk.yellow
					: chalk.gray;

		console.log(`${color(`[${rec.priority}]`)} ${chalk.bold(rec.title)}`);
		console.log(`  Potential Savings: ${chalk.green(rec.savings)}`);
		console.log(`  ${chalk.gray(rec.description)}`);
		console.log();
	}

	// Summary
	console.log(chalk.bold("📊 Quick Wins:"));
	console.log("  1. Right-size your instances based on actual usage");
	console.log("  2. Use auto-scaling for variable workloads");
	console.log(
		"  3. Consider PaaS alternatives for simplicity + cost savings",
	);
	console.log();
}

/**
 * Show pricing information for a provider
 */
export async function showPricing(options: CostOptions): Promise<void> {
	console.log(chalk.cyan("\n📋 Cloud Provider Pricing Information\n"));

	// Try to get dynamic pricing from PricingManager
	const pricingManager = getPricingManager();
	const dynamicPricing = await pricingManager.fetchPricing();
	const source = pricingManager.getLastSource();

	if (dynamicPricing) {
		console.log(
			chalk.gray(
				`  Source: ${source || "dynamic"} (v${dynamicPricing.version})`,
			),
		);
		console.log();
	}

	if (options.provider) {
		// Try dynamic pricing first, fall back to hardcoded
		const dynamicProvider = dynamicPricing?.providers[options.provider];
		const pricing = dynamicProvider || getPricing(options.provider);
		printProviderPricing(options.provider, pricing);
	} else {
		// Show all providers
		for (const provider of PROVIDERS) {
			const dynamicProvider =
				dynamicPricing?.providers[
					provider as keyof typeof dynamicPricing.providers
				];
			const pricing = dynamicProvider || getPricing(provider);
			printProviderPricing(provider, pricing);
			console.log();
		}
	}

	console.log(
		chalk.gray(
			"Note: Prices are estimates and may vary by region. Check provider websites for current pricing.",
		),
	);
	if (!dynamicPricing) {
		console.log(
			chalk.yellow(
				"  Using embedded pricing data. Run 'expressots costs update' to fetch latest prices.",
			),
		);
	}
	console.log();
}

/**
 * Get pricing for a provider (dynamic or fallback)
 */
async function getDynamicOrFallbackPricing(
	provider: CloudProvider,
): Promise<ProviderPricing> {
	const pricingManager = getPricingManager();
	const dynamicPricing = await pricingManager.fetchPricing();

	if (dynamicPricing?.providers[provider]) {
		return dynamicPricing.providers[provider];
	}

	return getPricing(provider);
}

/**
 * Calculate cost estimate for a provider
 */
function calculateEstimate(
	provider: CloudProvider,
	resources: {
		instances: number;
		cpu: number;
		memory: number;
		storage: number;
		bandwidth: number;
		hours: number;
	},
	options: CostOptions,
): CostEstimate {
	// Note: This function is sync for backward compat, uses cached pricing from PricingManager if available
	const pricing = getPricing(provider);

	// Calculate based on provider pricing model
	const hoursRatio = resources.hours / 720; // Ratio of running hours

	let computeCost = 0;
	let memoryCost = 0;
	const storageCost = resources.storage * pricing.storagePerGb;
	const bandwidthCost =
		Math.max(0, resources.bandwidth - pricing.freeBandwidth) *
		pricing.bandwidthPerGb;

	// Provider-specific calculations
	if (pricing.model === "per-hour") {
		computeCost =
			resources.instances *
			resources.cpu *
			pricing.cpuPerHour *
			resources.hours;
		memoryCost =
			resources.instances *
			resources.memory *
			pricing.memoryPerGbHour *
			resources.hours;
	} else if (pricing.model === "per-month") {
		computeCost = resources.instances * pricing.basePrice * hoursRatio;
	} else if (pricing.model === "usage") {
		// Usage-based (like serverless)
		computeCost = resources.instances * pricing.basePrice;
		memoryCost =
			resources.memory * pricing.memoryPerGbHour * resources.hours;
	}

	const totalCost = computeCost + memoryCost + storageCost + bandwidthCost;

	return {
		provider: provider.charAt(0).toUpperCase() + provider.slice(1),
		service: pricing.serviceName,
		monthlyCost: Math.round(totalCost * 100) / 100,
		breakdown: {
			compute: Math.round(computeCost * 100) / 100,
			memory: Math.round(memoryCost * 100) / 100,
			storage: Math.round(storageCost * 100) / 100,
			bandwidth: Math.round(bandwidthCost * 100) / 100,
			other: 0,
		},
		currency: "USD",
	};
}

/**
 * Print single estimate
 */
function printEstimate(estimate: CostEstimate, options: CostOptions): void {
	console.log(chalk.bold(`${estimate.provider} - ${estimate.service}`));
	console.log("-".repeat(40));
	console.log(`  Compute:   $${estimate.breakdown.compute.toFixed(2)}`);
	if (estimate.breakdown.memory) {
		console.log(`  Memory:    $${estimate.breakdown.memory.toFixed(2)}`);
	}
	console.log(`  Storage:   $${estimate.breakdown.storage.toFixed(2)}`);
	console.log(`  Bandwidth: $${estimate.breakdown.bandwidth.toFixed(2)}`);
	console.log("-".repeat(40));
	console.log(
		chalk.bold.cyan(
			`  Total:     $${estimate.monthlyCost.toFixed(2)}/month`,
		),
	);
	console.log();
}

/**
 * Print provider pricing info
 */
function printProviderPricing(
	provider: string,
	pricing: ProviderPricing,
): void {
	console.log(
		chalk.bold(`${provider.toUpperCase()} - ${pricing.serviceName}`),
	);
	console.log(`  Model: ${pricing.model}`);
	console.log(`  Base Price: $${pricing.basePrice}/month`);
	console.log(`  CPU: $${pricing.cpuPerHour}/hour`);
	console.log(`  Memory: $${pricing.memoryPerGbHour}/GB-hour`);
	console.log(`  Storage: $${pricing.storagePerGb}/GB-month`);
	console.log(
		`  Bandwidth: $${pricing.bandwidthPerGb}/GB (${pricing.freeBandwidth}GB free)`,
	);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(
	estimates: CostEstimate[],
	resources: {
		instances: number;
		cpu: number;
		memory: number;
		storage: number;
		bandwidth: number;
		hours: number;
	},
): string {
	let md = `# Cloud Cost Comparison Report

Generated by ExpressoTS CLI

## Resource Configuration

| Resource | Value |
|----------|-------|
| Instances | ${resources.instances} |
| CPU | ${resources.cpu} vCPU |
| Memory | ${resources.memory} GB |
| Storage | ${resources.storage} GB |
| Bandwidth | ${resources.bandwidth} GB/month |
| Hours | ${resources.hours}/month |

## Cost Comparison

| Provider | Service | Monthly Cost | Breakdown |
|----------|---------|--------------|-----------|
`;

	for (const est of estimates) {
		const breakdown = `Compute: $${est.breakdown.compute}, Storage: $${est.breakdown.storage}`;
		md += `| ${est.provider} | ${est.service} | **$${est.monthlyCost.toFixed(2)}** | ${breakdown} |\n`;
	}

	md += `
## Recommendations

1. **Cheapest Option**: ${estimates[0].provider} at $${estimates[0].monthlyCost.toFixed(2)}/month
2. Consider PaaS for simplicity (Railway, Render, Fly.io)
3. Use auto-scaling for variable workloads
4. Right-size instances based on actual usage

---
*Prices are estimates. Check provider websites for current pricing.*
`;

	return md;
}
