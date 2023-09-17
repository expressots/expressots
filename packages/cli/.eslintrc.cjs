module.exports = {
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: ["./tsconfig.json"],
	},
	plugins: ["@typescript-eslint/eslint-plugin"],
	extends: ["plugin:@typescript-eslint/recommended"],
	root: true,
	env: {
		node: true,
	},
	ignorePatterns: [
		"bin/*",
		"node_modules/*",
		"expressots.config.ts",
		"commitlint.config.ts",
		"vite.config.ts",
	],
	rules: {
		"@typescript-eslint/interface-name-prefix": "off",
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-unused-vars": "off",
		"@typescript-eslint/no-empty-function": "off",
		"no-trailing-spaces": ["error", { skipBlankLines: true }],
		"no-multi-spaces": ["error", { ignoreEOLComments: true }],
		"no-multi-spaces": "off",
	},
};
