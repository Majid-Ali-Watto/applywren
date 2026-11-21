import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `npm test`: unit + component tests (no services needed).
// `npm run test:integration`: API route tests against MongoDB (docker compose up -d).
const integration = process.env.TEST_SCOPE === "integration";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  css: { postcss: {} }, // the app's PostCSS config is for Next.js; tests don't need CSS
  // The app writes JSX in .js files.
  esbuild: { jsx: "automatic", loader: "jsx", include: /\.[jt]sx?$/, exclude: [] },
  test: {
    include: integration ? ["tests/integration/**/*.test.js"] : ["tests/unit/**/*.test.js"],
    setupFiles: integration ? ["tests/integration/setup.js"] : [],
    fileParallelism: !integration, // integration files share one database
    restoreMocks: true,
  },
});
