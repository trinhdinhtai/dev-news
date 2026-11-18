import { beforeEach, describe, expect, it } from "vitest";
import hnDayResponse from "./sources/hacker-news/__fixtures__/search-day.json";
import hnWeekResponse from "./sources/hacker-news/__fixtures__/search-week.json";
import { createDomainCore } from "./index";
import { fakeHttp, resetTestDb, testDb } from "./testing";

// 2026-11-18T05:08:24Z, a moment just after the fixtures were recorded.
const NOW = new Date(1794985704 * 1000);
// Algolia filters for the 24 hours and the 7 days before NOW.
const DAY_FILTER = "created_at_i>1794899304";
const WEEK_FILTER = "created_at_i>1794380904";

/** Algolia answering the week search from the week fixture and any other search from the day fixture. */
function hnHttp() {
  return fakeHttp({
    "hn.algolia.com": (url: URL) =>
      Response.json(url.searchParams.get("numericFilters") === WEEK_FILTER ? hnWeekResponse : hnDayResponse),
  });
}

describe("Hacker News Source Rankings", () => {
  beforeEach(resetTestDb);

  it("reads back what ingest stored: rank, title, URL, points and comments", async () => {
    const core = createDomainCore({ db: testDb, http: hnHttp() });

    await core.ingest("hacker-news", NOW);
    const ranking = await core.getSourceRanking({ sourceId: "hacker-news", timeWindow: "day" });

    expect(ranking.items).toHaveLength(30);
    expect(ranking.items[0]).toMatchObject({
      rank: 1,
      title: "New Evidence Shows School Phone Bans Are Gradually Improving Test Scores",
      url: "https://www.nytimes.com/2026/11/17/upshot/school-phone-bans-study-scores.html",
      metrics: { points: 1215, comments: 604 },
    });
    expect(ranking.items[2]).toMatchObject({
      rank: 3,
      title: "Java4Shell: RCE in OpenJDK when processing Base64",
      url: "https://calif.io/java4shell/",
      metrics: { points: 780, comments: 207 },
    });
    expect(ranking.items[29]).toMatchObject({ rank: 30, metrics: { points: 140, comments: 74 } });
  });

  it("ranks the week's best stories in their own Source Ranking, apart from the day's", async () => {
    const core = createDomainCore({ db: testDb, http: hnHttp() });

    await core.ingest("hacker-news", NOW);
    const week = await core.getSourceRanking({ sourceId: "hacker-news", timeWindow: "week" });
    const day = await core.getSourceRanking({ sourceId: "hacker-news", timeWindow: "day" });

    expect(week.items).toHaveLength(30);
    expect(week.items[0]).toMatchObject({
      rank: 1,
      title: "Jensen Huang resigns",
      metrics: { points: 4059, comments: 3487 },
    });
    expect(week.items[1]).toMatchObject({
      rank: 2,
      title: "Carnegie Mellon is putting computer science courses on YouTube for free",
      url: "https://www.cs.cmu.edu/learn/",
      metrics: { points: 2317, comments: 316 },
    });
    expect(week.items[29]).toMatchObject({ rank: 30, metrics: { points: 644, comments: 282 } });
    // A story in both Time Windows keeps a rank of its own in each.
    const school = "New Evidence Shows School Phone Bans Are Gradually Improving Test Scores";
    expect(day.items.find((item) => item.title === school)?.rank).toBe(1);
    expect(week.items.find((item) => item.title === school)?.rank).toBe(7);
    const java = "Java4Shell: RCE in OpenJDK when processing Base64";
    expect(day.items.find((item) => item.title === java)?.rank).toBe(3);
    expect(week.items.find((item) => item.title === java)?.rank).toBe(15);
  });

  it("keeps one Source Ranking when the same data is ingested twice", async () => {
    const core = createDomainCore({ db: testDb, http: hnHttp() });

    await core.ingest("hacker-news", NOW);
    const first = await core.getSourceRanking({ sourceId: "hacker-news", timeWindow: "day" });
    await core.ingest("hacker-news", new Date(NOW.getTime() + 30 * 60 * 1000));
    const second = await core.getSourceRanking({ sourceId: "hacker-news", timeWindow: "day" });

    expect(second.items).toHaveLength(30);
    expect(second.items.map((item) => item.rank)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(second.items).toEqual(first.items);
  });

  it("asks for the stories created in the 24 hours and in the 7 days before the given moment", async () => {
    const http = hnHttp();
    const core = createDomainCore({ db: testDb, http });

    await core.ingest("hacker-news", NOW);

    expect(http.requests.map((url) => url.searchParams.get("numericFilters"))).toEqual([DAY_FILTER, WEEK_FILTER]);
  });

  it("records when the Source last succeeded", async () => {
    const core = createDomainCore({ db: testDb, http: hnHttp() });

    await core.ingest("hacker-news", NOW);
    const ranking = await core.getSourceRanking({ sourceId: "hacker-news", timeWindow: "day" });

    expect(ranking.lastSucceededAt).toEqual(NOW);
  });
});
