import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore .next folders in apps
    "apps/**/.next/**",
    "**/node_modules/**",
    // Generated PWA service worker files (player-companion)
    "apps/player-companion/public/sw.js",
    "apps/player-companion/public/swe-worker-*.js",
    "apps/player-companion/public/workbox-*.js",
  ]),
  // Custom rule overrides - downgrade some strict rules to warnings
  {
    rules: {
      // Downgrade to warnings - these are technical debt to fix gradually
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "warn",
    },
  },
]);

export default eslintConfig;
