import type { Http } from "../http";

const USER_AGENT = "dev-news/0.1 (trending aggregator for developers)";

/** GETs a Source's JSON, identifying the app, and fails on any non-2xx answer. */
export async function fetchJson(http: Http, url: URL): Promise<unknown> {
  const response = await http(url.toString(), {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${url.host} answered ${response.status}`);
  return response.json();
}
