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
 * An HTTP layer that answers from recorded Source responses. A key is a host, or a
 * host and path with an optional query (`github.com/trending?since=daily`); the most
 * specific match wins. A string answers as HTML, anything else as JSON.
 * Every requested URL and its headers are kept so a test can check what was asked for.
 */
export function fakeHttp(responses: Record<string, unknown>): Http & { requests: URL[]; headers: Headers[] } {
  const requests: URL[] = [];
  const headers: Headers[] = [];
  const http = async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    requests.push(url);
    headers.push(new Headers(init?.headers));
    const key = [url.host + url.pathname + url.search, url.host + url.pathname, url.host].find(
      (candidate) => candidate in responses,
    );
    if (key === undefined) return new Response("not found", { status: 404 });
    const body = responses[key];
    if (typeof body === "string") return new Response(body, { headers: { "content-type": "text/html" } });
    return Response.json(body);
  };
  return Object.assign(http, { requests, headers });
}
