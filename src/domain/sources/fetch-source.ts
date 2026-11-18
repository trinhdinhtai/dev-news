import type { Http } from "../http";

// Names the app and links to it, so a Source can see who is calling and how to reach them.
const USER_AGENT = "dev-news/0.1 (+https://github.com/trinhdinhtai/dev-news)";

async function get(http: Http, url: URL, headers: Record<string, string>): Promise<Response> {
  const response = await http(url.toString(), { headers: { "user-agent": USER_AGENT, ...headers } });
  if (!response.ok) {
    const reset = response.headers.get("x-ratelimit-reset");
    if (response.headers.get("x-ratelimit-remaining") === "0" && reset) {
      throw new Error(`${url.host} rate limit reached; it resets at ${new Date(Number(reset) * 1000).toISOString()}`);
    }
    throw new Error(`${url.host} answered ${response.status}`);
  }
  return response;
}

/** GETs a Source's JSON, identifying the app, and fails on any non-2xx answer. */
export async function fetchJson(http: Http, url: URL, headers: Record<string, string> = {}): Promise<unknown> {
  return (await get(http, url, { accept: "application/json", ...headers })).json();
}

/** GETs a Source's HTML page, identifying the app, and fails on any non-2xx answer. */
export async function fetchText(http: Http, url: URL): Promise<string> {
  return (await get(http, url, { accept: "text/html" })).text();
}
