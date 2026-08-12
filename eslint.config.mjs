import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  // The two build outputs. Both are gitignored, so they are absent on a clean
  // clone — linting them made the error count depend on whether you had built.
  globalIgnores(["pages-dist/**", "extension-dist/**"]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  // Not added here: a webextension global env for `apps/ext/public/background.js`.
  // Its three `'chrome' is not defined` errors are part of the 15-error baseline
  // that Phase 4 owns; fixing them here would quietly move the number this phase
  // is measured against.
]);

export default eslintConfig;
