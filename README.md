# Dev News

What developers are reading today, ranked by each Source. Terms follow [`GLOSSARY.md`](GLOSSARY.md); decisions live in [`docs/adr/`](docs/adr/).

## Requirements

- Node 24 and pnpm 11
- Docker, for the local Postgres

## Run it locally

```sh
pnpm install
cp .env.example .env          # local database URLs
docker compose up -d          # Postgres 17 on localhost:5433
pnpm db:migrate               # apply the migrations in drizzle/
pnpm ingest                   # collect every Source that is due by its interval
pnpm ingest hacker-news       # or collect the named Sources now
pnpm dev                      # http://localhost:3000
```

The web app only reads the database. A Source's page stays empty until `pnpm ingest` has run for it. GitHub Trending needs `GITHUB_TOKEN` in `.env` to run more than once or twice an hour.

## Languages

The interface is in English (the default, at the bare paths) and Vietnamese (under `/vi`). A first visit picks the language from the browser's `Accept-Language`; the switch in the top bar changes it, and the `NEXT_LOCALE` cookie remembers the choice for a year. `src/proxy.ts` does that routing with next-intl. Every interface string lives in `src/i18n/messages/en.json` and `vi.json`: keys are typed against `en.json`, and a test fails when `vi.json` lacks a key. Each page is built once per language. Dates show in the viewer's own time zone.

## Collection

Each Source in the Source config (`src/domain/sources/`) sets `intervalMinutes`: Hacker News every 30 minutes, GitHub Trending hourly. `pnpm ingest` with no arguments ingests the Sources whose interval has passed since they were last tried, one after another, so a failing Source is retried at its own pace. A Source that fails keeps its last good Source Ranking and success time; its error and the moment are stored on the Source, the other Sources are still ingested, and the run exits 1. Every answer a Source gives is kept in `raw_responses`: a successful ingest's answers until the next successful ingest of that Source, a failed ingest's for seven days so the failure can be diagnosed. That keeps the table to one ingest's pages per Source plus any recent failures. Requests to Sources carry the User-Agent `dev-news/0.1 (+https://github.com/trinhdinhtai/dev-news)`.

The Overview and each Source's page are built as static pages, cached under one `source:<id>` tag per Source, and show when each Source was last updated. After a run, `pnpm ingest` calls `POST /api/revalidate` on `REVALIDATE_URL` with `REVALIDATE_SECRET` for the Sources it ingested, which marks their cached data stale. The next visit gets the old page while the new one is built, and the visit after that gets the new data. Without those two variables the cached pages stay as they are.

## Deploy

The web app runs on Vercel, the database on Neon, and collection on GitHub Actions (ADR-0001).

1. **Neon**: create a project and copy two connection strings: the pooled one (host contains `-pooler`) for Vercel and the direct one for GitHub Actions, which also runs the migrations.
2. **Vercel**: import the repo. Under Environment Variables set `DATABASE_URL` (Neon, pooled) and `REVALIDATE_SECRET` (a long random string, such as the output of `openssl rand -hex 32`). The build prerenders the pages from the database, so migrate and ingest once before the first deploy (`DATABASE_URL=<direct> pnpm db:migrate && pnpm ingest`), or redeploy after the first collection run.
3. **GitHub Actions**: under Settings → Secrets and variables → Actions, add the secrets `DATABASE_URL` (Neon, direct) and `REVALIDATE_SECRET` (the same value as on Vercel), and the variable `REVALIDATE_URL` (the production URL, such as `https://dev-news.vercel.app`). The workflow's own `GITHUB_TOKEN` covers GitHub Trending.

`.github/workflows/collect.yml` runs every 15 minutes; that is only a tick, and each run ingests just the due Sources. Run it by hand from the Actions tab, optionally naming Sources. GitHub may start scheduled runs late or skip them under load, which is why each page shows when its Source was last updated. GitHub also turns off the schedule of a public repo after 60 days without commits; re-enable it from the Actions tab.

## Migrations

The schema lives in `src/domain/db/schema.ts`. After changing it:

```sh
pnpm db:generate              # write a new SQL migration into drizzle/
pnpm db:migrate               # apply it
```

## Tests

```sh
pnpm test
```

Tests go through the domain core only (`ingest` and the read side). The HTTP layer answers from recorded Source responses in `src/domain/sources/*/__fixtures__`, and the database is a real Postgres: the tests create `dev_news_test` from `TEST_DATABASE_URL` on first run, migrate it and empty it before each test. Postgres must be running (`docker compose up -d`).

Before a commit: `pnpm typecheck && pnpm lint && pnpm test`.
