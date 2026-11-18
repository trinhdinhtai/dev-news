import { beforeEach, describe, expect, it } from "vitest";
import hnDayResponse from "./sources/hacker-news/__fixtures__/search-day.json";
import { createDomainCore } from "./index";
import { fakeHttp, resetTestDb, testDb } from "./testing";

// 2026-11-18T05:08:24Z, a moment just after the fixture was recorded.
const NOW = new Date(1794985704 * 1000);

describe("Hacker News daily Source Ranking", () => {
  beforeEach(resetTestDb);

  it("reads back what ingest stored: rank, title, URL, points and comments", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp({ "hn.algolia.com": hnDayResponse }) });

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
});
