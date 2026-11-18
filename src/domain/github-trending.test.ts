import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import repos from "./sources/github-trending/__fixtures__/repos.json";
import { createDomainCore } from "./index";
import { fakeHttp, resetTestDb, testDb } from "./testing";

const fixture = (name: string) =>
  readFileSync(new URL(`./sources/github-trending/__fixtures__/${name}`, import.meta.url), "utf8");
const dayHtml = fixture("trending-day.html");
const weekHtml = fixture("trending-week.html");

// Just after the fixtures were recorded.
const NOW = new Date("2026-11-18T07:30:00Z");

/** Recorded trending pages and the REST answer for every repo on them. */
function githubResponses(overrides: Record<string, unknown> = {}) {
  const rest = Object.fromEntries(Object.entries(repos).map(([name, repo]) => [`api.github.com/repos/${name}`, repo]));
  return {
    "github.com/trending?since=daily": dayHtml,
    "github.com/trending?since=weekly": weekHtml,
    ...rest,
    ...overrides,
  };
}

describe("GitHub Trending Source Ranking", () => {
  beforeEach(resetTestDb);

  it("ranks the daily trending repos by stars gained today, with the details from REST", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp(githubResponses()) });

    await core.ingest("github-trending", NOW);
    const ranking = await core.getSourceRanking({ sourceId: "github-trending", timeWindow: "day" });

    expect(ranking.items.map((item) => [item.title, item.metrics.starsGained])).toEqual([
      ["obra/superpowers", 1917],
      ["dream-num/univer", 1774],
      ["ag-ui-protocol/ag-ui", 1445],
      ["google-research/paper-orchestra", 1072],
      ["elementalsouls/Claude-BugHunter", 1005],
      ["affaan-m/ECC", 883],
      ["alibaba/open-code-review", 763],
      ["mvanhorn/last30days-skill", 696],
      ["backnotprop/plannotator", 691],
      ["getarcaneapp/arcane", 618],
      ["Tencent/LoopForge", 591],
      ["sveltejs/svelte", 477],
      ["google-labs-code/stitch-skills", 350],
      ["cursor/plugins", 201],
      ["jingyaogong/minimind", 192],
    ]);
    expect(ranking.items[0]).toMatchObject({
      rank: 1,
      url: "https://github.com/obra/superpowers",
      description: "An agentic skills framework & software development methodology that works.",
      programmingLanguage: "Shell",
      metrics: { starsGained: 1917, stars: 319555, forks: 28488 },
    });
    expect(ranking.items[4]).toMatchObject({
      rank: 5,
      title: "elementalsouls/Claude-BugHunter",
      description: expect.stringMatching(/^A Claude Code skill bundle for bug hunting/),
      programmingLanguage: "Python",
      metrics: { starsGained: 1005, stars: 9931, forks: 1403 },
    });
    expect(ranking.items[14]).toMatchObject({ rank: 15, programmingLanguage: "Python" });
  });

  it("ranks the weekly trending repos by stars gained this week", async () => {
    const core = createDomainCore({ db: testDb, http: fakeHttp(githubResponses()) });

    await core.ingest("github-trending", NOW);
    const ranking = await core.getSourceRanking({ sourceId: "github-trending", timeWindow: "week" });

    expect(ranking.items.map((item) => [item.title, item.metrics.starsGained])).toEqual([
      ["meta/astryx", 8700],
      ["GoogleChrome/modern-web-guidance-src", 7015],
      ["anthropics/skills", 4847],
      ["we-promise/sure", 4786],
      ["addyosmani/agent-skills", 3884],
      ["alibaba/open-code-review", 3675],
      ["ZhuLinsen/daily_stock_analysis", 3653],
      ["vercel-labs/agent-browser", 3429],
      ["tradermonty/claude-trading-skills", 2985],
      ["ChromeDevTools/chrome-devtools-mcp", 2948],
      ["backnotprop/plannotator", 2926],
      ["openai/codex-security", 2531],
      ["elementalsouls/Claude-BugHunter", 2508],
      ["google-labs-code/stitch-skills", 1197],
    ]);
    expect(ranking.items[0]).toMatchObject({
      rank: 1,
      url: "https://github.com/meta/astryx",
      description: "An open source design system that's fully customizable and agent ready",
      programmingLanguage: "TypeScript",
      metrics: { starsGained: 8700, stars: 30303, forks: 2367 },
    });
    expect(ranking.items[13]).toMatchObject({
      rank: 14,
      programmingLanguage: "TypeScript",
      metrics: { starsGained: 1197, stars: 10216, forks: 1335 },
    });
  });

  it("looks up each repo on the REST API once, even when it trends in both Time Windows", async () => {
    const http = fakeHttp(githubResponses());
    const core = createDomainCore({ db: testDb, http });

    await core.ingest("github-trending", NOW);

    const restCalls = http.requests.filter((url) => url.host === "api.github.com").map((url) => url.pathname);
    // 15 daily and 14 weekly repos, 4 of them in both.
    expect(restCalls).toHaveLength(25);
    expect(new Set(restCalls).size).toBe(25);
  });

  it("treats a trending page whose layout changed as a Source error and keeps the old Source Ranking", async () => {
    await createDomainCore({ db: testDb, http: fakeHttp(githubResponses()) }).ingest("github-trending", NOW);

    const changed = fakeHttp(
      githubResponses({ "github.com/trending?since=weekly": weekHtml.replaceAll("Box-row", "TrendingRow") }),
    );
    const core = createDomainCore({ db: testDb, http: changed });
    await expect(core.ingest("github-trending", new Date(NOW.getTime() + 60 * 60 * 1000))).rejects.toThrow(
      /layout may have changed/,
    );

    for (const timeWindow of ["day", "week"] as const) {
      const ranking = await core.getSourceRanking({ sourceId: "github-trending", timeWindow });
      expect(ranking.lastSucceededAt).toEqual(NOW);
      expect(ranking.items).toHaveLength(timeWindow === "day" ? 15 : 14);
    }
  });

  it("treats a repo row without its stars gained as a Source error", async () => {
    const core = createDomainCore({
      db: testDb,
      http: fakeHttp(githubResponses({ "github.com/trending?since=daily": dayHtml.replace("1,005 stars today", "") })),
    });

    await expect(core.ingest("github-trending", NOW)).rejects.toThrow(/row 1 is unreadable/);
    const ranking = await core.getSourceRanking({ sourceId: "github-trending", timeWindow: "day" });
    expect(ranking.lastSucceededAt).toBeNull();
    expect(ranking.items).toEqual([]);
  });

});
