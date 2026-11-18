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
pnpm ingest hacker-news       # collect one Source into the database
pnpm ingest github-trending   # needs GITHUB_TOKEN in .env to run more than once or twice an hour
pnpm dev                      # http://localhost:3000
```

The web app only reads the database. A Source's page stays empty until `pnpm ingest <source-id>` has run for it.

The home page is the Overview: the top five of each Source's daily ranking, built as a static page. Its data is cached under one `source:<id>` tag per Source. After an ingest, `pnpm ingest` calls `POST /api/revalidate` on `REVALIDATE_URL` with `REVALIDATE_SECRET`, which marks that Source's cached data stale (only the Overview is cached so far; Source pages read the database on each request). The next visit gets the old page while the new one is built, and the visit after that gets the new data. Without those two variables the cached pages stay as they are.

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
