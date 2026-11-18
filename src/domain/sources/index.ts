import { hackerNews } from "./hacker-news/adapter";
import type { SourceAdapter } from "./types";

export const adapters: SourceAdapter[] = [hackerNews];

export function findAdapter(sourceId: string): SourceAdapter | undefined {
  return adapters.find((adapter) => adapter.id === sourceId);
}
