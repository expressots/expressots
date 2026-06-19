/**
 * Unit tests for the case-conversion helpers in
 * `src/generate/utils/string-utils.ts`. These functions are pure, so
 * tests run in microseconds and act as the safety net for every
 * generator (controllers, modules, configs, etc.) that derives
 * filenames and class names from user input.
 */

import {
	anyCaseToCamelCase,
	anyCaseToKebabCase,
	anyCaseToPascalCase,
	anyCaseToSnakeCase,
	anyCaseToUpperCase,
	anyCaseToLowerCase,
	anyCaseToUpperSnakeCase,
} from "../../src/generate/utils/string-utils";

describe("string-utils", () => {
	describe("anyCaseToCamelCase", () => {
		it("converts kebab-case", () => {
			expect(anyCaseToCamelCase("user-profile")).toBe("userProfile");
		});

		it("converts snake_case", () => {
			expect(anyCaseToCamelCase("user_profile")).toBe("userProfile");
		});

		it("lowers leading char of PascalCase", () => {
			expect(anyCaseToCamelCase("UserProfile")).toBe("userProfile");
		});

		it("leaves camelCase untouched", () => {
			expect(anyCaseToCamelCase("userProfile")).toBe("userProfile");
		});

		it("handles empty string", () => {
			expect(anyCaseToCamelCase("")).toBe("");
		});

		it("handles single character", () => {
			expect(anyCaseToCamelCase("U")).toBe("u");
			expect(anyCaseToCamelCase("a")).toBe("a");
		});

		it("handles multiple consecutive separators", () => {
			expect(anyCaseToCamelCase("user--profile")).toBe("userProfile");
			expect(anyCaseToCamelCase("user__profile")).toBe("userProfile");
		});

		it("handles trailing separator", () => {
			expect(anyCaseToCamelCase("user-")).toBe("user");
		});

		it("preserves digits", () => {
			expect(anyCaseToCamelCase("user-2-profile")).toBe("user2Profile");
		});
	});

	describe("anyCaseToKebabCase", () => {
		it("converts camelCase", () => {
			expect(anyCaseToKebabCase("userProfile")).toBe("user-profile");
		});

		it("converts PascalCase", () => {
			expect(anyCaseToKebabCase("UserProfile")).toBe("user-profile");
		});

		it("converts snake_case", () => {
			expect(anyCaseToKebabCase("user_profile")).toBe("user-profile");
		});

		it("leaves kebab-case untouched", () => {
			expect(anyCaseToKebabCase("user-profile")).toBe("user-profile");
		});

		it("handles all-uppercase acronyms", () => {
			// Limitation of the current implementation: consecutive
			// uppercase letters are not split. We pin behavior so
			// regressions surface in PR diffs.
			expect(anyCaseToKebabCase("APIKey")).toBe("apikey");
		});

		it("handles digits", () => {
			expect(anyCaseToKebabCase("user2Profile")).toBe("user2-profile");
		});

		it("handles empty string", () => {
			expect(anyCaseToKebabCase("")).toBe("");
		});
	});

	describe("anyCaseToPascalCase", () => {
		it("converts kebab-case", () => {
			expect(anyCaseToPascalCase("user-profile")).toBe("UserProfile");
		});

		it("converts snake_case", () => {
			expect(anyCaseToPascalCase("user_profile")).toBe("UserProfile");
		});

		it("converts camelCase", () => {
			expect(anyCaseToPascalCase("userProfile")).toBe("UserProfile");
		});

		it("leaves PascalCase untouched", () => {
			expect(anyCaseToPascalCase("UserProfile")).toBe("UserProfile");
		});

		it("handles empty string", () => {
			expect(anyCaseToPascalCase("")).toBe("");
		});

		it("handles single lowercase character", () => {
			expect(anyCaseToPascalCase("a")).toBe("A");
		});
	});

	describe("anyCaseToSnakeCase", () => {
		it("converts camelCase", () => {
			expect(anyCaseToSnakeCase("userProfile")).toBe("user_profile");
		});

		it("converts kebab-case", () => {
			expect(anyCaseToSnakeCase("user-profile")).toBe("user_profile");
		});

		it("converts PascalCase", () => {
			expect(anyCaseToSnakeCase("UserProfile")).toBe("user_profile");
		});

		it("handles empty string", () => {
			expect(anyCaseToSnakeCase("")).toBe("");
		});
	});

	describe("anyCaseToUpperCase", () => {
		it("uppercases everything", () => {
			expect(anyCaseToUpperCase("userProfile")).toBe("USERPROFILE");
		});

		it("strips separators while uppercasing", () => {
			expect(anyCaseToUpperCase("user-profile")).toBe("USERPROFILE");
			expect(anyCaseToUpperCase("user_profile")).toBe("USERPROFILE");
		});

		it("handles empty string", () => {
			expect(anyCaseToUpperCase("")).toBe("");
		});
	});

	describe("anyCaseToLowerCase", () => {
		it("lowercases everything", () => {
			expect(anyCaseToLowerCase("UserProfile")).toBe("userprofile");
		});

		it("strips separators while lowercasing", () => {
			expect(anyCaseToLowerCase("USER-PROFILE")).toBe("userprofile");
		});

		it("handles empty string", () => {
			expect(anyCaseToLowerCase("")).toBe("");
		});
	});

	describe("anyCaseToUpperSnakeCase", () => {
		it("converts camelCase to UPPER_SNAKE_CASE", () => {
			expect(anyCaseToUpperSnakeCase("userProfile")).toBe(
				"USER_PROFILE",
			);
		});

		it("converts kebab-case to UPPER_SNAKE_CASE", () => {
			expect(anyCaseToUpperSnakeCase("user-profile")).toBe(
				"USER_PROFILE",
			);
		});

		it("converts PascalCase to UPPER_SNAKE_CASE", () => {
			expect(anyCaseToUpperSnakeCase("UserProfile")).toBe(
				"USER_PROFILE",
			);
		});

		it("handles digits in identifier", () => {
			expect(anyCaseToUpperSnakeCase("api2Key")).toBe("API2_KEY");
		});

		it("handles empty string", () => {
			expect(anyCaseToUpperSnakeCase("")).toBe("");
		});
	});
});
