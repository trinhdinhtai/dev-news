import { afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { createDb } from "./db/client";
import type { Http } from "./http";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is not set");

export const testDb = createDb(url);
afterAll(() => testDb.$client.end());

/** Gives each test an empty database. */
export async function resetTestDb() {
  await testDb.execute(sql`truncate table source_rankings, items, sources restart identity cascade`);
}

/**
 * An HTTP layer that answers from recorded Source responses, keyed by host.
 * Every requested URL is kept in `requests` so a test can check what was asked for.
 */
export function fakeHttp(responses: Record<string, unknown>): Http & { requests: URL[] } {
  const requests: URL[] = [];
  const http = async (input: string) => {
    const url = new URL(input);
    requests.push(url);
    if (!(url.host in responses)) return new Response("not found", { status: 404 });
    return Response.json(responses[url.host]);
  };
  return Object.assign(http, { requests });
}
