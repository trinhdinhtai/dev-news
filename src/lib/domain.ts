import { createDomainCore, type DomainCore } from "@/domain";
import { createDb, type Db } from "@/domain/db/client";

// One database client per server process, so dev hot reloads do not pile up connections.
// Only the client is kept: a core kept across reloads would keep serving old code.
const globalForDomain = globalThis as unknown as { db?: Db };

/** The domain core the web app reads through. The web never calls a Source itself. */
export function domain(): DomainCore {
  if (!globalForDomain.db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set; copy .env.example to .env");
    globalForDomain.db = createDb(url);
  }
  return createDomainCore({ db: globalForDomain.db, http: fetch });
}
