module.exports = {
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint/eslint-plugin"],
    extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    ignorePatterns: [".eslintrc.js"],
    rules: {
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "no-trailing-spaces": ["error", { skipBlankLines: true }],
        "no-multi-spaces": ["error", { ignoreEOLComments: true }],
        "no-multi-spaces": "off",
        "prettier/prettier": ["error", { endOfLine: "auto" }, { tabWidth: 4 }],
        "prettier/prettier": "off",
    },
};
