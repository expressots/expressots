/* eslint-env node */
module.exports = {
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "eslint-config-prettier",
    ],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    root: true,
    env: { node: true, jest: true },
    rules: { "@typescript-eslint/no-explicit-any": "off" },
    ignorePatterns: ["lib", "node_modules", ".eslintrc.cjs", "scripts"],
};
