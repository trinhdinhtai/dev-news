import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import repos from "./sources/github-trending/__fixtures__/repos.json";
import hnDayResponse from "./sources/hacker-news/__fixtures__/search-day.json";
import { createDomainCore } from "./index";
import { fakeHttp, resetTestDb, testDb } from "./testing";

const trendingPage = (name: string) =>
  readFileSync(new URL(`./sources/github-trending/__fixtures__/${name}`, import.meta.url), "utf8");

/** Recorded answers for every Source the domain core knows. */
const everySource = {
  "hn.algolia.com": hnDayResponse,
  "github.com/trending?since=daily": trendingPage("trending-day.html"),
  "github.com/trending?since=weekly": trendingPage("trending-week.html"),
  ...Object.fromEntries(Object.entries(repos).map(([name, repo]) => [`api.github.com/repos/${name}`, repo])),
};

const GITHUB_AT = new Date("2026-11-18T07:30:00Z");
const HN_AT = new Date(1794985704 * 1000);

describe("Overview", () => {
  beforeEach(resetTestDb);

  it("gives the top 5 Items of each Source's daily ranking, Sources in the default order", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp(everySource) });
    // Ingested in the opposite order, so the Overview's order cannot come from insertion.
    await core.ingest("hacker-news", HN_AT);
    await core.ingest("github-trending", GITHUB_AT);

    const overview = await core.getOverview();

    expect(overview.map((block) => block.sourceId)).toEqual(["github-trending", "hacker-news"]);
    expect(overview[0].lastSucceededAt).toEqual(GITHUB_AT);
    expect(overview[0].items.map((item) => [item.rank, item.title])).toEqual([
      [1, "obra/superpowers"],
      [2, "dream-num/univer"],
      [3, "ag-ui-protocol/ag-ui"],
      [4, "google-research/paper-orchestra"],
      [5, "elementalsouls/Claude-BugHunter"],
    ]);
    expect(overview[1].lastSucceededAt).toEqual(HN_AT);
    expect(overview[1].items.map((item) => item.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(overview[1].items[0]).toMatchObject({
      title: "New Evidence Shows School Phone Bans Are Gradually Improving Test Scores",
      metrics: { points: 1215, comments: 604 },
    });
    expect(overview[1].items[2]).toMatchObject({
      title: "Java4Shell: RCE in OpenJDK when processing Base64",
      metrics: { points: 780, comments: 207 },
    });
  });

  it("leaves out a Source that has no ranking yet", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp(everySource) });
    await core.ingest("hacker-news", HN_AT);

    const overview = await core.getOverview();

    expect(overview.map((block) => block.sourceId)).toEqual(["hacker-news"]);
  });

  it("is empty before any Source has been ingested", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp(everySource) });

    expect(await core.getOverview()).toEqual([]);
  });
});
