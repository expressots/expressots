/**
 * Local JSON pricing source - reads from user's custom pricing file
 */

import fs from "fs";
import path from "path";
import os from "os";
import type { PricingData, PricingSource } from "../types";

const DEFAULT_PATH = path.join(os.homedir(), ".expressots", "pricing.json");

export class LocalJSONPricingSource implements PricingSource {
	name = "local";
	private filePath: string;

	constructor(filePath?: string) {
		this.filePath = filePath || DEFAULT_PATH;
	}

	async fetch(): Promise<PricingData | null> {
		try {
			if (!fs.existsSync(this.filePath)) {
				return null;
			}

			const content = fs.readFileSync(this.filePath, "utf-8");
			const pricing: PricingData = JSON.parse(content);

			// Basic validation
			if (!pricing.version || !pricing.providers) {
				return null;
			}

			return pricing;
		} catch {
			return null;
		}
	}

	/**
	 * Check if custom pricing file exists
	 */
	exists(): boolean {
		return fs.existsSync(this.filePath);
	}

	/**
	 * Get the file path
	 */
	getPath(): string {
		return this.filePath;
	}

	/**
	 * Set custom file path
	 */
	setPath(filePath: string): void {
		this.filePath = filePath;
	}
}

export function createLocalJSONPricingSource(filePath?: string): PricingSource {
	return new LocalJSONPricingSource(filePath);
}
