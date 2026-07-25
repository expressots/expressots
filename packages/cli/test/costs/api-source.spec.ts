/**
 * Unit tests for the API pricing source placeholder.
 */

import { createAPIPricingSource } from "../../src/costs/sources/api-source";

describe("APIPricingSource", () => {
	it("returns null until the remote API is implemented", async () => {
		const source = createAPIPricingSource();
		expect(source.name).toBe("api");
		expect(await source.fetch()).toBeNull();
	});
});
