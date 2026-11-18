import { beforeEach, describe, expect, it } from "vitest";
import hnDayResponse from "./sources/hacker-news/__fixtures__/search-day.json";
import { createDomainCore } from "./index";
import { fakeHttp, resetTestDb, testDb } from "./testing";

const HN_AT = new Date(1794985704 * 1000);
const LATER = new Date(HN_AT.getTime() + 30 * 60 * 1000);

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
