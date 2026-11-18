/** The HTTP layer the domain core reaches Sources through; `fetch` in production, a fake in tests. */
export type Http = (url: string, init?: RequestInit) => Promise<Response>;
