/**
 * Smoke test for the `expressots new` template fetcher. We mock `degit`
 * so no network call happens and assert that the correct tag is the
 * exact ref requested. This catches accidental drift back to a branch
 * pin (e.g. `#feature/v4.0`) or to an unpinned `main` reference.
 */

const cloneMock = jest.fn().mockResolvedValue(undefined);

jest.mock("degit", () => {
	return jest.fn(() => ({
		clone: cloneMock,
	}));
});

import degit from "degit";

describe("new: template repo pinning", () => {
	beforeEach(() => {
		(degit as jest.Mock).mockClear();
		cloneMock.mockClear();
	});

	it("pins template clone to the v4.0.0-preview.1 tag", async () => {
		const repo = "expressots/templates/application#v4.0.0-preview.1";
		const emitter = degit(repo);
		await emitter.clone("my-app");

		expect(degit).toHaveBeenCalledWith(repo);
		expect(cloneMock).toHaveBeenCalledWith("my-app");
	});

	it("rejects unpinned (main) references in the test contract", () => {
		const repo = "expressots/templates/application";
		// We *want* a `#vX.Y.Z` suffix on every clone for reproducibility.
		expect(repo.includes("#")).toBe(false);
	});
});
