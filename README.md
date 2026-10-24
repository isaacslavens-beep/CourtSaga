# CourtSaga

A free, simple diary for the tennis you watch: explore the story of any tour-level singles match since
2003, star the ones you care about, read your saga back, look up the records in Statistics, and play with
models of the numbers in Interact. Live at [courtsaga.com](https://www.courtsaga.com).

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
| `app/(app)/` | The app's pages (`/explore`, `/saga`, `/statistics`, `/interact`, `/account`) and the server actions that keep a diary. Explore opens signed out only for a shared match, with nowhere to go from it. |
| `app/diary/records.ts`, `lib/records.ts` | Statistics: every board's rules, and the loader that reads a tour's matches and builds them. The pages are prerendered and rebuilt daily. |
| `app/diary/models.ts`, `lib/models.ts` | Interact: models fitted to a tour's matches (the top 10 at any moment, upset odds, Elo ratings across eras, serving, big points under pressure, ages), and the loader that fits them. Built ahead of time and rebuilt daily, like Statistics. |
| `app/(auth)/` | Sign up and log in. |
| `app/s/[slug]/` | A shared saga: read-only, kept out of search engines. |
| `app/api/` | Better Auth's endpoints and `GET /api/search`. |
| `lib/` | Accounts (`auth.ts`), diary and search queries (`diary.ts`). |
| `db/`, `drizzle/` | The schema and database client, and the migrations generated from them. |
| `scripts/` | `migrate.ts` and `import-matches.ts`. |
| `proxy.ts` | Sends signed-in fans from `/` to their log, and everyone else from diary pages to log in. |

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
