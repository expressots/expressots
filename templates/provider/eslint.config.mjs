import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-async-promise-executor": "off",
      "no-trailing-spaces": ["error", { skipBlankLines: true }],
    },
  },
  {
    ignores: [
      "node_modules/**",
      "lib/**",
      "coverage/**",
      "scripts/**",
      "test/**",
      "*.config.ts",
      "*.config.js",
      "*.config.mjs",
      "*.config.cjs",
    ],
  },
);
