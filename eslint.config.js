import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
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
    ignores: [
      "dist/**",
      "node_modules/**",
      ".workflow/**",
      "packages/gen-qa/**",
      // Workflow-harness scripts run with injected globals (agent/log/phase/
      // pipeline); they are not app code and never compile standalone.
      "workflows/**",
      // Generated lesson-viewer browser data (build_lesson_data.py output);
      // mockups/ is a review surface, not lintable app code.
      "mockups/**",
    ],
  },
);