import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import repos from "./sources/github-trending/__fixtures__/repos.json";
import { createDomainCore } from "./index";
import { createGithubTrending, githubTrending } from "./sources/github-trending/adapter";
import { fakeHttp, resetTestDb, testDb, unfilteredSources } from "./testing";

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
    const core = createDomainCore({ db: testDb, adapters: unfilteredSources, http: fakeHttp(githubResponses()) });

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
    const core = createDomainCore({ db: testDb, adapters: unfilteredSources, http: fakeHttp(githubResponses()) });

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
    const core = createDomainCore({ db: testDb, adapters: unfilteredSources, http });

    await core.ingest("github-trending", NOW);

    const restCalls = http.requests.filter((url) => url.host === "api.github.com").map((url) => url.pathname);
    // 15 daily and 14 weekly repos, 4 of them in both.
    expect(restCalls).toHaveLength(25);
    expect(new Set(restCalls).size).toBe(25);
  });

  it("treats a trending page whose layout changed as a Source error and keeps the old Source Ranking", async () => {
    await createDomainCore({ db: testDb, adapters: unfilteredSources, http: fakeHttp(githubResponses()) }).ingest("github-trending", NOW);

    const changed = fakeHttp(
      githubResponses({ "github.com/trending?since=weekly": weekHtml.replaceAll("Box-row", "TrendingRow") }),
    );
    const core = createDomainCore({ db: testDb, adapters: unfilteredSources, http: changed });
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
      adapters: unfilteredSources,
      http: fakeHttp(githubResponses({ "github.com/trending?since=daily": dayHtml.replace("1,005 stars today", "") })),
    });

    await expect(core.ingest("github-trending", NOW)).rejects.toThrow(/row 1 is unreadable/);
    const ranking = await core.getSourceRanking({ sourceId: "github-trending", timeWindow: "day" });
    expect(ranking.lastSucceededAt).toBeNull();
    expect(ranking.items).toEqual([]);
  });

  it("calls the REST API with the GitHub token, and never sends it to the trending page", async () => {
    const http = fakeHttp(githubResponses());
    const core = createDomainCore({ db: testDb, adapters: unfilteredSources, http, secrets: { githubToken: "test-token" } });

    await core.ingest("github-trending", NOW);

    const authorizationByHost = http.requests.map((url, i) => [url.host, http.headers[i].get("authorization")]);
    expect(authorizationByHost).toContainEqual(["api.github.com", "Bearer test-token"]);
    expect(authorizationByHost.filter(([host, auth]) => host === "api.github.com" && auth !== "Bearer test-token")).toEqual([]);
    expect(authorizationByHost.filter(([host, auth]) => host === "github.com" && auth !== null)).toEqual([]);
  });

  it("stops at the REST rate limit, keeps the old Source Ranking and says when the limit resets", async () => {
    await createDomainCore({ db: testDb, adapters: unfilteredSources, http: fakeHttp(githubResponses()) }).ingest("github-trending", NOW);

    const rateLimited = () =>
      new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
        status: 403,
        headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1795000000" },
      });
    const limited = fakeHttp({
      "github.com/trending?since=daily": dayHtml,
      "github.com/trending?since=weekly": weekHtml,
      "api.github.com": rateLimited,
    });
    const core = createDomainCore({ db: testDb, adapters: unfilteredSources, http: limited });

    await expect(core.ingest("github-trending", new Date(NOW.getTime() + 60 * 60 * 1000))).rejects.toThrow(
      "api.github.com rate limit reached; it resets at 2026-11-18T11:06:40.000Z",
    );
    expect(limited.requests.filter((url) => url.host === "api.github.com")).toHaveLength(1);
    const ranking = await core.getSourceRanking({ sourceId: "github-trending", timeWindow: "day" });
    expect(ranking.lastSucceededAt).toEqual(NOW);
    expect(ranking.items).toHaveLength(15);
  });
});

describe("GitHub Trending per programming language", () => {
  beforeEach(resetTestDb);

  /** The unfiltered pages plus recorded Python and Rust pages for both Time Windows. */
  function languageHttp() {
    return fakeHttp(
      githubResponses({
        "github.com/trending/python?since=daily": fixture("trending-python-day.html"),
        "github.com/trending/python?since=weekly": fixture("trending-python-week.html"),
        "github.com/trending/rust?since=daily": fixture("trending-rust-day.html"),
        "github.com/trending/rust?since=weekly": fixture("trending-rust-week.html"),
      }),
    );
  }

  const twoLanguages = createGithubTrending({
    languages: [
      { id: "python", label: "Python", path: "python" },
      { id: "rust", label: "Rust", path: "rust" },
    ],
  });

  it("gives each language its own Source Ranking, ranked by stars gained", async () => {
    const core = createDomainCore({ db: testDb, http: languageHttp(), adapters: [twoLanguages] });

    await core.ingest("github-trending", NOW);
    const python = await core.getSourceRanking({ sourceId: "github-trending", timeWindow: "day", filter: "python" });
    const rust = await core.getSourceRanking({ sourceId: "github-trending", timeWindow: "day", filter: "rust" });

    expect(python.items).toHaveLength(19);
    expect(python.items.slice(0, 3).map((item) => [item.rank, item.title, item.metrics.starsGained])).toEqual([
      [1, "elementalsouls/Claude-BugHunter", 2322],
      [2, "google-research/paper-orchestra", 1529],
      [3, "kajisho5/ffmpeg-skill", 1292],
    ]);
    expect(python.items[18]).toMatchObject({ rank: 19, title: "vllm-project/vllm-ascend" });
    expect(rust.items).toHaveLength(17);
    expect(rust.items.slice(0, 3).map((item) => [item.rank, item.title, item.metrics.starsGained])).toEqual([
      [1, "antithesishq/bombadil", 380],
      [2, "rust-lang/rust", 305],
      [3, "tauri-apps/tauri", 265],
    ]);
    expect(rust.items[1]).toMatchObject({ programmingLanguage: "Rust", url: "https://github.com/rust-lang/rust" });
  });

  it("keeps each language's week, and the unfiltered ranking, apart", async () => {
    const core = createDomainCore({ db: testDb, http: languageHttp(), adapters: [twoLanguages] });

    await core.ingest("github-trending", NOW);
    const rustWeek = await core.getSourceRanking({ sourceId: "github-trending", timeWindow: "week", filter: "rust" });
    const everyLanguage = await core.getSourceRanking({ sourceId: "github-trending", timeWindow: "day" });

    expect(rustWeek.items).toHaveLength(9);
    expect(rustWeek.items.slice(0, 2).map((item) => [item.title, item.metrics.starsGained])).toEqual([
      ["vercel-labs/agent-browser", 3429],
      ["martin-olivier/airgorah", 1468],
    ]);
    expect(everyLanguage.items).toHaveLength(15);
    expect(everyLanguage.items[0]).toMatchObject({ rank: 1, title: "obra/superpowers" });
  });

  it("asks for the trending page of every language in both Time Windows", async () => {
    const http = languageHttp();
    const core = createDomainCore({ db: testDb, http, adapters: [twoLanguages] });

    await core.ingest("github-trending", NOW);

    const pages = http.requests.filter((url) => url.host === "github.com").map((url) => url.pathname + url.search);
    expect(pages.toSorted()).toEqual([
      "/trending/python?since=daily",
      "/trending/python?since=weekly",
      "/trending/rust?since=daily",
      "/trending/rust?since=weekly",
      "/trending?since=daily",
      "/trending?since=weekly",
    ]);
  });
});

describe("The configured GitHub Trending languages", () => {
  beforeEach(resetTestDb);

  it("asks GitHub for each language by its own path, C++ and C# included", async () => {
    // Every page answers with the recorded daily page; only the requested paths matter here.
    const http = fakeHttp({ ...githubResponses(), "github.com": () => new Response(dayHtml) });
    const core = createDomainCore({ db: testDb, http, adapters: [githubTrending] });

    await core.ingest("github-trending", NOW);

    const paths = new Set(http.requests.filter((url) => url.host === "github.com").map((url) => url.pathname));
    expect([...paths].toSorted()).toEqual([
      "/trending",
      "/trending/c%23",
      "/trending/c++",
      "/trending/go",
      "/trending/java",
      "/trending/javascript",
      "/trending/python",
      "/trending/rust",
      "/trending/typescript",
    ]);
    const csharp = await core.getSourceRanking({ sourceId: "github-trending", timeWindow: "week", filter: "csharp" });
    expect(csharp.items).toHaveLength(15);
  });
});
