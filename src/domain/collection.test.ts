import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import repos from "./sources/github-trending/__fixtures__/repos.json";
import hnDayResponse from "./sources/hacker-news/__fixtures__/search-day.json";
import { createDomainCore, type Http } from "./index";
import { fakeHttp, resetTestDb, testDb } from "./testing";

const HN_AT = new Date(1794985704 * 1000);
const MINUTE = 60 * 1000;
const LATER = new Date(HN_AT.getTime() + 30 * MINUTE);

const trendingPage = (name: string) =>
  readFileSync(new URL(`./sources/github-trending/__fixtures__/${name}`, import.meta.url), "utf8");

/** Recorded answers for every Source the domain core knows. */
const everySource = {
  "hn.algolia.com": hnDayResponse,
  "github.com/trending?since=daily": trendingPage("trending-day.html"),
  "github.com/trending?since=weekly": trendingPage("trending-week.html"),
  ...Object.fromEntries(Object.entries(repos).map(([name, repo]) => [`api.github.com/repos/${name}`, repo])),
};

describe("A failed ingest", () => {
  beforeEach(resetTestDb);

  it("keeps the last good Source Ranking and success time when the answer is malformed, and records the error", async () => {
    await createDomainCore({ db: testDb, http: fakeHttp({ "hn.algolia.com": hnDayResponse }) }).ingest(
      "hacker-news",
      HN_AT,
    );
    const broken = createDomainCore({ db: testDb, http: fakeHttp({ "hn.algolia.com": { hits: "nope" } }) });

    await expect(broken.ingest("hacker-news", LATER)).rejects.toThrow();
    const ranking = await broken.getSourceRanking({ sourceId: "hacker-news", timeWindow: "day" });
    const status = (await broken.getSourceStatuses()).find((s) => s.sourceId === "hacker-news")!;

    expect(ranking.items).toHaveLength(30);
    expect(ranking.lastSucceededAt).toEqual(HN_AT);
    expect(status).toMatchObject({ sourceId: "hacker-news", lastSucceededAt: HN_AT, lastErrorAt: LATER });
    expect(status.lastError).toMatch(/hits/);
  });

  it("records a network error for a Source that never succeeded", async () => {
    const offline = createDomainCore({
      db: testDb,
      http: async () => {
        throw new TypeError("fetch failed");
      },
    });

    await expect(offline.ingest("hacker-news", LATER)).rejects.toThrow("fetch failed");
    const statuses = await offline.getSourceStatuses();

    expect(statuses).toEqual([
      { sourceId: "github-trending", lastSucceededAt: null, lastError: null, lastErrorAt: null },
      { sourceId: "hacker-news", lastSucceededAt: null, lastError: "fetch failed", lastErrorAt: LATER },
    ]);
  });
});

describe("Raw Source responses", () => {
  beforeEach(resetTestDb);

  it("keeps what the Source answered, with the Source and the moment", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp({ "hn.algolia.com": hnDayResponse }) });

    await core.ingest("hacker-news", HN_AT);
    const responses = await core.getRawResponses("hacker-news");

    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({ sourceId: "hacker-news", fetchedAt: HN_AT, status: 200 });
    expect(new URL(responses[0].url).host).toBe("hn.algolia.com");
    expect(JSON.parse(responses[0].body)).toEqual(hnDayResponse);
  });

  it("keeps a malformed answer too, so the failure can be diagnosed", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp({ "hn.algolia.com": { hits: "nope" } }) });

    await expect(core.ingest("hacker-news", HN_AT)).rejects.toThrow();
    const responses = await core.getRawResponses("hacker-news");

    expect(responses.map((response) => JSON.parse(response.body))).toEqual([{ hits: "nope" }]);
  });

  it("drops the responses of ingests more than a week old", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp({ "hn.algolia.com": hnDayResponse }) });
    const day = 24 * 60 * 60 * 1000;

    await core.ingest("hacker-news", HN_AT);
    await core.ingest("hacker-news", new Date(HN_AT.getTime() + 6 * day));
    await core.ingest("hacker-news", new Date(HN_AT.getTime() + 8 * day));
    const responses = await core.getRawResponses("hacker-news");

    expect(responses.map((response) => response.fetchedAt)).toEqual([
      new Date(HN_AT.getTime() + 8 * day),
      new Date(HN_AT.getTime() + 6 * day),
    ]);
  });
});

describe("A collection run", () => {
  beforeEach(resetTestDb);

  it("still updates the other Sources when one fails, and reports which failed", async () => {
    const githubDown = Object.entries(everySource).filter(([key]) => key !== "github.com/trending?since=daily");
    const core = createDomainCore({ db: testDb, http: fakeHttp(Object.fromEntries(githubDown)) });

    const results = await core.collect(HN_AT);
    const statuses = await core.getSourceStatuses();

    expect(results).toEqual([
      { sourceId: "github-trending", ok: false, error: "github.com answered 404" },
      { sourceId: "hacker-news", ok: true },
    ]);
    expect(statuses).toMatchObject([
      { sourceId: "github-trending", lastSucceededAt: null, lastErrorAt: HN_AT },
      { sourceId: "hacker-news", lastSucceededAt: HN_AT, lastError: null },
    ]);
    expect((await core.getSourceRanking({ sourceId: "hacker-news", timeWindow: "day" })).items).toHaveLength(30);
  });

  it("keeps a failing Source's last good ranking and success time while another Source in the run updates", async () => {
    await createDomainCore({ db: testDb, http: fakeHttp(everySource) }).collect(HN_AT);
    const recorded = fakeHttp(everySource);
    const failures: Record<string, Http> = {
      "a malformed answer": fakeHttp({ ...everySource, "hn.algolia.com": { hits: "nope" } }),
      "a network error": (url, init) =>
        new URL(url).host === "hn.algolia.com" ? Promise.reject(new TypeError("fetch failed")) : recorded(url, init),
    };
    let at = HN_AT;

    for (const [failure, http] of Object.entries(failures)) {
      at = new Date(at.getTime() + 60 * MINUTE);
      const core = createDomainCore({ db: testDb, http });

      const results = await core.collect(at);
      const [github, hn] = await core.getSourceStatuses();

      expect(results.map((result) => [result.sourceId, result.ok]), failure).toEqual([
        ["github-trending", true],
        ["hacker-news", false],
      ]);
      expect(github.lastSucceededAt, failure).toEqual(at);
      expect(hn, failure).toMatchObject({ lastSucceededAt: HN_AT, lastErrorAt: at });
      expect(hn.lastError, failure).toBeTruthy();
      const ranking = await core.getSourceRanking({ sourceId: "hacker-news", timeWindow: "day" });
      expect(ranking.items, failure).toHaveLength(30);
      expect(ranking.items[0].title, failure).toBe(
        "New Evidence Shows School Phone Bans Are Gradually Improving Test Scores",
      );
    }
  });

  it("retries a failing Source at its own interval, not on every run", async () => {
    const http = fakeHttp({ ...everySource, "hn.algolia.com": { hits: "nope" } });
    const core = createDomainCore({ db: testDb, http });
    const ran = async (minutes: number) =>
      (await core.collect(new Date(HN_AT.getTime() + minutes * MINUTE))).map((result) => result.sourceId);

    expect(await ran(0)).toEqual(["github-trending", "hacker-news"]);
    expect(await ran(15)).toEqual([]);
    expect(await ran(30)).toEqual(["hacker-news"]);
  });

  it("ingests a Source only once its own interval has passed: Hacker News every 30 minutes, GitHub Trending hourly", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp(everySource) });
    const at = (minutes: number) => new Date(HN_AT.getTime() + minutes * MINUTE);
    const ran = async (minutes: number) => (await core.collect(at(minutes))).map((result) => result.sourceId);

    expect(await ran(0)).toEqual(["github-trending", "hacker-news"]);
    expect(await ran(15)).toEqual([]);
    // A scheduled run a few minutes early still counts, since GitHub Actions starts runs late and unevenly.
    expect(await ran(28)).toEqual(["hacker-news"]);
    expect(await ran(60)).toEqual(["github-trending", "hacker-news"]);
  });

  it("ingests the named Sources whether or not they are due", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp(everySource) });

    await core.collect(HN_AT);
    const results = await core.collect(new Date(HN_AT.getTime() + MINUTE), { sourceIds: ["github-trending"] });

    expect(results).toEqual([{ sourceId: "github-trending", ok: true }]);
  });
});

describe("Requests to Sources", () => {
  beforeEach(resetTestDb);

  it("name the app and where to reach it in the User-Agent, on every request to every Source", async () => {
    const http = fakeHttp(everySource);

    await createDomainCore({ db: testDb, http }).collect(HN_AT);

    expect(new Set(http.requests.map((url) => url.host))).toEqual(
      new Set(["github.com", "api.github.com", "hn.algolia.com"]),
    );
    for (const headers of http.headers) {
      expect(headers.get("user-agent")).toBe("dev-news/0.1 (+https://github.com/trinhdinhtai/dev-news)");
    }
  });
});
