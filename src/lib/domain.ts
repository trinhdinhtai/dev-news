import { createDomainCore, type DomainCore } from "@/domain";
import { createDb } from "@/domain/db/client";

// One domain core per server process; dev hot reloads reuse it so connections do not pile up.
const globalForDomain = globalThis as unknown as { domainCore?: DomainCore };

/** The domain core the web app reads through. The web never calls a Source itself. */
export function domain(): DomainCore {
  if (!globalForDomain.domainCore) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set; copy .env.example to .env");
    globalForDomain.domainCore = createDomainCore({ db: createDb(url), http: fetch });
  }
  return globalForDomain.domainCore;
}
