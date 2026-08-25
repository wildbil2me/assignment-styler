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
  // `design/` is generated upstream and audited by its own canonical checker;
  // local lint must not rewrite or reinterpret vendored authority files.
  // `work/` is gitignored local scratch, and the same trap as the build outputs:
  // lint was reading files a clean clone does not have.
  globalIgnores(["pages-dist/**", "extension-dist/**", "design/**", "work/**"]),
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
    rules: {
      // `const { animation, ...rest } = block` is how a field is dropped from an
      // object, and the discarded name is the point of the expression rather
      // than an oversight.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // The MV3 service worker. `chrome` is a webextension global and no stock
  // eslint global set carries it, which is what the three `'chrome' is not
  // defined` errors in the old baseline were.
  {
    files: ["apps/ext/public/background.js"],
    languageOptions: { globals: { chrome: "readonly" } },
  },
]);

export default eslintConfig;
