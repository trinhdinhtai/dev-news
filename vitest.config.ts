import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env: rely on the environment, as CI does.
}

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    globalSetup: ["./src/domain/test-global-setup.ts"],
    // Every test file shares one real Postgres database, so they run one at a time.
    fileParallelism: false,
  },
});
