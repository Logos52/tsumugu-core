import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import noComments from "./eslint/no-comments.js";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".workflow/**",
      "packages/gen-qa/**",
      "workflows/**",
      "mockups/**",
      "app/public/**",
      "content/**",
      "private/**",
      "coverage/**",
      "scripts/lint-fixtures/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    plugins: {
      tsumugu: {
        rules: {
          "no-comments": noComments,
        },
      },
    },
    rules: {
      "tsumugu/no-comments": "error",
    },
  },
);
