import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 60_000,
    include: ["packages/**/*.test.ts", "lib/**/*.test.ts"],
    env: {
      MOC_SETTLEMENT_ADAPTER: "mock",
    },
  },
  resolve: {
    alias: {
      "@moc/domain": path.resolve(__dirname, "packages/domain/src/index.ts"),
      "@moc/ports": path.resolve(__dirname, "packages/ports/src/index.ts"),
      "@moc/application": path.resolve(__dirname, "packages/application/src/index.ts"),
      "@moc/adapters": path.resolve(__dirname, "packages/adapters/src/index.ts"),
      "@moc/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
      "@": path.resolve(__dirname),
    },
  },
});
