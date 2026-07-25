/**
 * Unit tests for the remote JSON pricing source.
 */

import { EventEmitter } from "events";
import type { IncomingMessage } from "http";

const httpsGetMock = jest.fn();

jest.mock("https", () => ({
	get: (...args: unknown[]) => httpsGetMock(...args),
}));

import { createRemoteJSONPricingSource } from "../../src/costs/sources/remote-json-source";

const pricingUrl = "https://example.com/pricing.json";

function mockResponse(statusCode: number, body?: string): void {
	httpsGetMock.mockImplementation(
		(_url: string, _options: unknown, callback: (res: IncomingMessage) => void) => {
			const res = new EventEmitter() as IncomingMessage & {
				statusCode: number;
			};
			res.statusCode = statusCode;
			const req = new EventEmitter() as EventEmitter & {
				destroy: jest.Mock;
			};
			req.destroy = jest.fn();

			process.nextTick(() => {
				callback(res);
				if (body !== undefined) {
					res.emit("data", body);
				}
				res.emit("end");
			});

			return req;
		},
	);
}

function mockNetworkError(): void {
	httpsGetMock.mockImplementation(() => {
		const req = new EventEmitter() as EventEmitter & {
			destroy: jest.Mock;
		};
		req.destroy = jest.fn();
		process.nextTick(() => req.emit("error", new Error("network error")));
		return req;
	});
}

beforeEach(() => {
	httpsGetMock.mockReset();
});

describe("RemoteJSONPricingSource", () => {
	it("returns parsed pricing on HTTP 200", async () => {
		mockResponse(
			200,
			JSON.stringify({ version: "1.0.0", providers: {} }),
		);

		const source = createRemoteJSONPricingSource(pricingUrl);
		const data = await source.fetch();
		expect(data?.version).toBe("1.0.0");
	});

	it("returns null on non-200 status", async () => {
		mockResponse(404);

		const source = createRemoteJSONPricingSource(pricingUrl);
		expect(await source.fetch()).toBeNull();
	});

	it("returns null on network error", async () => {
		mockNetworkError();

		const source = createRemoteJSONPricingSource(pricingUrl);
		expect(await source.fetch()).toBeNull();
	});

	it("returns null on invalid JSON", async () => {
		mockResponse(200, "{bad json");

		const source = createRemoteJSONPricingSource(pricingUrl);
		expect(await source.fetch()).toBeNull();
	});
});
