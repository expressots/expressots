/**
 * Remote JSON pricing source - fetches from GitHub-hosted pricing file
 */

import https from "https";
import type { PricingData, PricingSource } from "../types";

const DEFAULT_URL =
	"https://raw.githubusercontent.com/expressots/pricing/main/pricing.json";
const FETCH_TIMEOUT = 10000;

export class RemoteJSONPricingSource implements PricingSource {
	name = "remote";
	private url: string;

	constructor(url?: string) {
		this.url = url || DEFAULT_URL;
	}

	async fetch(): Promise<PricingData | null> {
		return new Promise((resolve) => {
			const request = https.get(
				this.url,
				{ timeout: FETCH_TIMEOUT },
				(response) => {
					if (response.statusCode !== 200) {
						resolve(null);
						return;
					}

					let data = "";
					response.on("data", (chunk) => {
						data += chunk;
					});
					response.on("end", () => {
						try {
							const pricing: PricingData = JSON.parse(data);
							resolve(pricing);
						} catch {
							resolve(null);
						}
					});
				},
			);

			request.on("error", () => {
				resolve(null);
			});

			request.on("timeout", () => {
				request.destroy();
				resolve(null);
			});
		});
	}
}

export function createRemoteJSONPricingSource(url?: string): PricingSource {
	return new RemoteJSONPricingSource(url);
}
