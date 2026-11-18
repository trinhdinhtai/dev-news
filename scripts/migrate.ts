import { migrateDb } from "../src/domain/db/migrate";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set; copy .env.example to .env");

await migrateDb(url);
console.log("Migrations applied.");
