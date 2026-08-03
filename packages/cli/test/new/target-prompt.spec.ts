import {
	resolveTargetFromChoice,
	templateSupportsTargetPrompt,
	validateTargetTemplate,
} from "../../src/new/target-prompt";

describe("interactive deployment-target prompt", () => {
	describe("templateSupportsTargetPrompt", () => {
		it("offers the prompt for the micro template", () => {
			expect(
				templateSupportsTargetPrompt(
					"Micro :: A minimalistic template for building micro APIs and serverless functions.",
				),
			).toBe(true);
		});

		it("skips the prompt for the application template", () => {
			expect(
				templateSupportsTargetPrompt(
					"Application :: Full-featured ExpressoTS application. (Recommended)",
				),
			).toBe(false);
		});
	});

	describe("resolveTargetFromChoice", () => {
		it("maps the Cloudflare choice onto the --target flag value", () => {
			expect(
				resolveTargetFromChoice(
					"Cloudflare Workers :: Deploy to the edge with Wrangler.",
				),
			).toBe("cloudflare");
		});

		it("leaves the Node.js choice untargeted", () => {
			expect(
				resolveTargetFromChoice(
					"Node.js :: Standard Node.js server. (Recommended)",
				),
			).toBeUndefined();
		});
	});

	it("only ever produces target/template pairs the flag validator accepts", () => {
		// The wizard has no validation step of its own — it is correct by
		// construction because the prompt is gated on the template. This
		// pins that invariant to the same rule the flags path enforces.
		const templateChoices = [
			"Application :: Full-featured ExpressoTS application. (Recommended)",
			"Micro :: A minimalistic template for building micro APIs and serverless functions.",
		];
		const targetChoices = [
			"Node.js :: Standard Node.js server. (Recommended)",
			"Cloudflare Workers :: Deploy to the edge with Wrangler.",
		];

		for (const templateChoice of templateChoices) {
			const template = templateChoice.startsWith("Micro")
				? "micro"
				: "application";

			for (const targetChoice of targetChoices) {
				const target = templateSupportsTargetPrompt(templateChoice)
					? resolveTargetFromChoice(targetChoice)
					: undefined;

				expect(validateTargetTemplate(target, template)).toBe(true);
			}
		}
	});
});
