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
pnpm dev                      # http://localhost:3000
```

The web app only reads the database. A Source's page stays empty until `pnpm ingest <source-id>` has run for it.

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
