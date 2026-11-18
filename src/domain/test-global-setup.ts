import postgres from "postgres";
import { migrateDb } from "./db/migrate";

// Creates the test database if it is missing, then applies every migration.
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set; copy .env.example to .env");

  const dbName = new URL(url).pathname.slice(1);
  const admin = postgres(url.replace(/\/[^/?]+(\?|$)/, "/postgres$1"), { max: 1, onnotice: () => {} });
  try {
    const [found] = await admin`select 1 from pg_database where datname = ${dbName}`;
    if (!found) await admin.unsafe(`create database "${dbName}"`);
  } finally {
    await admin.end();
  }

  await migrateDb(url);
}
