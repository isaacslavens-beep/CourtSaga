# CourtSaga

A free, simple diary for the tennis you watch, in four parts: **Tournaments** (every big final since 2003,
each opening the story around it), **Matches** (every tour-level singles match since 2003, sorted by any
statistic and filtered by anything), **Statistics** (record lists, the top 10 at any moment, and models of
the numbers to play with) and, with an account, your **Saga** of the matches you've starred. Live at
[courtsaga.com](https://www.courtsaga.com).

## How it's built

- **Next.js 16** (App Router with Cache Components) and Tailwind 4, deployed by Vercel from `main`.
- **Postgres on Neon**, through the Vercel Marketplace, with **Drizzle ORM**. Migrations are in `drizzle/`.
- **Better Auth**: email and password only. No email check at sign-up, no social logins, magic links, 2FA or
  password reset, so the site never sends email.
- **Match data**: TML-Database (Jeff Sackmann's format), loaded by `scripts/import-matches.ts`.

## Where things are

| Path | What it is |
| --- | --- |
| `app/page.tsx`, `app/hero*.tsx` | The landing page. Its demos run on a sample log and save nothing. |
| `app/demos/` | The sample log and its hand-checked rivalry records, for the demos only. |
| `app/diary/` | The log, ranking and saga, used by both the demos and real diaries. `library.ts` holds the shared types and rules, `books.ts` the saga's rules, `store.tsx` the state and saving, and `finder.tsx` match search. |
| `app/(app)/` | The app's pages: home (`/`), `/tournaments`, `/matches` (and `/matches/<id>`, one match's story), `/statistics`, `/saga`, and the server actions that keep a diary. Every page is open to anyone; starring asks for an account. `/advanced` forwards to Statistics' chapter of the same name, and next.config.ts redirects the older addresses (`/explore?m=<id>` is `/matches/<id>`). |
| `app/diary/matches.ts`, `app/diary/match-index.ts`, `lib/match-index.ts` | Matches: every statistic, filter, oddity and example search; the engine that keeps a tour's matches in memory as typed columns, checks them (serve stats that don't add up to the score and impossible lengths are left out) and searches, sorts and ranks them; the drama score; and "How extreme" on a match's page. The API is `GET /api/matches` and `/api/matches/find`. |
| `app/diary/records.ts`, `lib/records.ts` | Statistics' record lists: every board's rules, and the loader that builds them. The pages are prerendered and rebuilt daily. |
| `app/diary/models.ts`, `lib/models.ts` | Statistics' models: the top 10 at any moment, Elo ratings across eras, serving, big points under pressure and ages, fitted to a tour's matches. The browser fetches them (`GET /api/models`) when one of their chapters opens. |
| `app/(auth)/` | Sign up and log in. |
| `app/s/[slug]/` | A shared saga: read-only, kept out of search engines. |
| `app/api/` | Better Auth's endpoints, match search (`/api/search`), stories (`/api/story`), Matches (`/api/matches`) and the models (`/api/models`). |
| `lib/` | Accounts (`auth.ts`), diary and search queries (`diary.ts`). |
| `db/`, `drizzle/` | The schema and database client, and the migrations generated from them. |
| `scripts/` | `migrate.ts` and `import-matches.ts`. |

## Running it locally

1. `npm install`
2. Get a Postgres database with the `unaccent` and `pg_trgm` extensions. A Neon branch works, and so does
   local Postgres 15 or later.
3. Copy `.env.example` to `.env.local` and set `DATABASE_URL` and `BETTER_AUTH_SECRET`
   (`openssl rand -base64 32`).
4. `npm run db:migrate` creates the tables.
5. `npm run import:matches -- ~/Desktop/courtsaga/tml-data` loads the matches, in about ten seconds.
6. `npm run dev`, then open http://localhost:3000.

## The match data

The import reads `YYYY.csv` (ATP) and `YYYY_wta.csv` (WTA) from a folder, every row of every year it
finds. The CSVs are never committed.

- **Run it again any time.** Players and matches are upserted, so a re-run changes nothing unless the
  files did. Nothing is ever deleted; matches a run no longer finds are reported and kept.
- **2026 and later.** Put `2026.csv` and `2026_wta.csv` in the folder and run the import again. No code
  changes.
- **Match ids** are `tour_tourneyId_round_winnerId_loserId` (for example `atp_2025-540_F_S0AG_A0E2`). They
  never change between imports, because diary entries point at them.
- **Fixes it makes:** two rows give Harshana Godamanna the id G793 (Juan-Andres Gomez's) and one gives
  Marc-Andrea Huesler MH30 (John Millman's). Those rows move to 104631 and HH06; Gomez and Millman keep
  their own. Names are trimmed and use their most recent spelling. A match listed twice is merged. A few
  ordinary events filed under the wrong level are put back in their tier.
- **What it keeps:** walkovers, defaults with no games played (2014 WTA rows record walkovers that way) and
  empty scores are imported but never shown in search, because they never happened. Retirements, defaults
  and abandoned matches are searchable and show how they ended.
- **Dates:** `tourney_date` is a tournament's first day, so a match's month is estimated from how far into
  the event its round falls. The season always comes from the file name.

The data is TML-Database (non-commercial use) built on Jeff Sackmann's tennis data (CC BY-NC-SA 4.0).
CourtSaga credits both in its footers. Keep the site non-commercial (no ads, no paid tier) unless you get
permission, and don't publish the raw data.

## Deploying

A push to `main` deploys to production. Vercel runs `npm run vercel-build`, which applies any new
migrations before `next build`. That only happens on production builds; previews skip it, so a branch's
migrations never reach the production database before it's merged. Every setting is in `.env.example`.

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` / `lint` | The usual Next.js commands. `build` needs no database, but without one the prerendered pages (the landing page's demo and Statistics) say the match data isn't available. |
| `npm run db:generate` | Writes a new migration to `drizzle/` after a change to `db/schema.ts`. |
| `npm run db:migrate` | Applies migrations to `DATABASE_URL_UNPOOLED` (or `DATABASE_URL`). |
| `npm run import:matches -- <folder>` | Loads or refreshes the match data. |
| `npm run books` | Works out the record books, the models and Matches' table of every match into `assets/books/`. Vercel runs it before every build; the matches are only read from the database when an import has changed them, because the free Neon plan allows 5 GB of transfer a month and one full read is about 60 MB. |
