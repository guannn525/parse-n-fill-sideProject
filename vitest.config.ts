import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.test.ts",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "src/index.ts",
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50,
        },
        // AI tools and agent logic should maintain high coverage
        "./src/ai/**": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        // File parsers are critical infrastructure
        "./src/parsers/**": {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        // Validation schemas ensure data integrity
        "./src/schemas/**": {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
