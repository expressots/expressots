/**
 * API pricing source - fetches from ExpressoTS pricing API
 * Currently a placeholder for future implementation
 */

import type { PricingData, PricingSource } from "../types";

const API_URL = "https://api.expressots.com/pricing/v1";

export class APIPricingSource implements PricingSource {
	name = "api";

	async fetch(): Promise<PricingData | null> {
		// API not yet implemented - return null to fall through to next source
		// In the future, this will fetch from the ExpressoTS pricing API
		try {
			// Placeholder for future API implementation
			// const response = await fetch(API_URL);
			// if (!response.ok) return null;
			// return await response.json();
			return null;
		} catch {
			return null;
		}
	}
}

export function createAPIPricingSource(): PricingSource {
	return new APIPricingSource();
}
