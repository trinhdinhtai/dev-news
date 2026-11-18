import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env: rely on the environment.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/domain/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
