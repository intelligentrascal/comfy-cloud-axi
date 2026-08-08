import globals from "globals";
import tseslint from "typescript-eslint";
import js from "@eslint/js";

export default [
  { files: ["**/*.ts"] },
  { languageOptions: { globals: globals.node } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
