import { githubTrending } from "./github-trending/adapter";
import { hackerNews } from "./hacker-news/adapter";
import type { SourceAdapter } from "./types";

/**
 * The Source config. The order is the Overview's fixed default order: GitHub Trending,
 * Hacker News, daily.dev, dev.to, Reddit, YouTube, YouTube Shorts as each one lands.
 */
export const adapters: SourceAdapter[] = [githubTrending, hackerNews];
