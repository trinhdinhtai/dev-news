import type { Http } from "../http";

const USER_AGENT = "dev-news/0.1 (trending aggregator for developers)";

async function get(http: Http, url: URL, headers: Record<string, string>): Promise<Response> {
  const response = await http(url.toString(), { headers: { "user-agent": USER_AGENT, ...headers } });
  if (!response.ok) throw new Error(`${url.host} answered ${response.status}`);
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
