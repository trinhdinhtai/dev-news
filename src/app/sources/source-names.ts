/** How each Source is named on screen, and what its daily Source Ranking holds. */
export const sourceDisplay: Record<string, { name: string; dayRanking: string; credit: string }> = {
  "hacker-news": {
    name: "Hacker News",
    dayRanking: "The highest-scored stories posted in the last 24 hours.",
    credit: "Rankings come from Algolia HN Search.",
  },
};
