// The database: accounts (Better Auth's tables), the match data scripts/import-matches.ts loads, and
// each fan's diary. Migrations in drizzle/ are generated from this file with `npm run db:generate`.

import { sql } from "drizzle-orm";
import { bigint, boolean, check, customType, date, foreignKey, index, integer, pgTable, primaryKey, real, smallint, text, timestamp } from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ---------- Accounts: Better Auth's own tables, email and password only ---------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

// Better Auth's one-off tokens (CourtSaga doesn't use any yet, but Better Auth expects the table)
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// Sign-in, sign-up and other account requests, per IP address and path
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* ---------- Match data: every tour-level singles match since 2003, from TML-Database ---------- */

// Ids are only unique within a tour, so a player is (tour, id)
export const players = pgTable(
  "players",
  {
    tour: text("tour").notNull(), // "atp" | "wta"
    id: text("id").notNull(),
    name: text("name").notNull(), // full name, the most recent spelling
    shortName: text("short_name").notNull(), // the surname, as the site shows players
    ioc: text("ioc"),
    hand: text("hand"), // R | L | U (unknown), from their latest match
    height: smallint("height"), // centimetres
    searchName: text("search_name").notNull(), // lower case without accents, for fuzzy search
    matchCount: integer("match_count").notNull(),
    lastSeen: date("last_seen").notNull(), // the latest match their name and country were taken from
  },
  (t) => [primaryKey({ columns: [t.tour, t.id] }), index("players_search_name_idx").using("gin", sql`${t.searchName} gin_trgm_ops`)],
);

export const matches = pgTable(
  "matches",
  {
    // tour + tourney_id + round + winner + loser. Diary entries point at it, so it never changes.
    id: text("id").primaryKey(),
    tour: text("tour").notNull(),
    season: smallint("season").notNull(), // from the file name: an event starting on 30 Dec counts towards the next year
    tourneyId: text("tourney_id").notNull(),
    tourneyName: text("tourney_name").notNull(), // as the dataset has it
    event: text("event").notNull(), // tidied for showing, e.g. "Indian Wells" or "Davis Cup"
    stage: text("stage"), // team events: the tie, e.g. "World Group QF · AUS vs USA"
    level: text("level").notNull(), // the dataset's tourney_level
    tier: text("tier").notNull(), // slam | 1000 | 500 | 250 | finals | olympics | team | other
    surface: text("surface").notNull(), // hard | clay | grass | carpet | unknown
    indoor: boolean("indoor"),
    drawSize: smallint("draw_size"),
    startDate: date("start_date").notNull(), // tourney_date: the first day of the tournament
    playedOn: date("played_on").notNull(), // estimated from the start date and the round; only the month is shown
    round: text("round").notNull(), // R128 … F, RR, BR (bronze medal) or 3P (third place)
    matchNum: integer("match_num"),
    winnerId: text("winner_id").notNull(),
    loserId: text("loser_id").notNull(),
    score: text("score").notNull(), // winner first, as in the dataset
    bestOf: smallint("best_of").notNull(),
    outcome: text("outcome").notNull(), // completed | retired | defaulted | abandoned | walkover | unplayed
    minutes: integer("minutes"),
    // Each player as they came into the match: seed, how they got in (Q qualifier, WC wildcard, LL lucky
    // loser, PR protected ranking, ...), ranking, ranking points and age in years
    winnerSeed: smallint("winner_seed"),
    winnerEntry: text("winner_entry"),
    winnerRank: integer("winner_rank"),
    winnerPoints: integer("winner_points"),
    winnerAge: real("winner_age"),
    loserSeed: smallint("loser_seed"),
    loserEntry: text("loser_entry"),
    loserRank: integer("loser_rank"),
    loserPoints: integer("loser_points"),
    loserAge: real("loser_age"),
    // Serve stats, winner then loser, as the data has them: aces, double faults, points served, first serves
    // in, first-serve points won, second-serve points won, service games, break points saved and faced.
    // Null where the data has none.
    winnerStats: smallint("winner_stats").array(),
    loserStats: smallint("loser_stats").array(),
    // Walkovers and empty scores never happened as matches: kept, but never found by search
    searchable: boolean("searchable").notNull(),
    search: tsvector("search").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({ columns: [t.tour, t.winnerId], foreignColumns: [players.tour, players.id], name: "matches_winner_fk" }),
    foreignKey({ columns: [t.tour, t.loserId], foreignColumns: [players.tour, players.id], name: "matches_loser_fk" }),
    index("matches_search_idx").using("gin", t.search),
    index("matches_winner_idx").on(t.tour, t.winnerId, t.loserId),
    index("matches_loser_idx").on(t.tour, t.loserId, t.winnerId),
    index("matches_played_idx").on(t.playedOn),
    index("matches_event_idx").on(t.tour, t.event),
    index("matches_tourney_idx").on(t.tour, t.tourneyId),
    index("matches_peer_idx").on(t.tour, t.tier, t.round),
  ],
);

/* ---------- The diary: one page per match a fan stars, watched or not ---------- */

export const diaryEntries = pgTable(
  "diary_entries",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id),
    // A starred match the fan watched says how (Live | TV | Stream); one starred without watching has none
    watchedOn: text("watched_on"),
    // "YYYY-MM": when it was watched, or for a match not watched, when it was starred
    watchedDate: text("watched_date").notNull(),
    rating: smallint("rating"), // 1 to 5, or none
    // Sides rather than names, so they hold whatever a player is called
    cheering: text("cheering"), // "winner" | "loser" | null
    pickWinner: text("pick_winner"), // "winner" | "loser" | null: your call on who wins
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    note: text("note").notNull().default(""),
    classic: boolean("classic").notNull().default(false),
    position: integer("position").notNull(), // place in the fan's own ranking, best first
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.matchId] }),
    index("diary_entries_match_idx").on(t.matchId),
    check("diary_entries_rating", sql`${t.rating} between 1 and 5`),
    check("diary_entries_watched_on", sql`${t.watchedOn} in ('Live', 'TV', 'Stream')`),
    check("diary_entries_watched_date", sql`${t.watchedDate} ~ '^\\d{4}-(0[1-9]|1[0-2])$'`),
    check("diary_entries_cheering", sql`${t.cheering} in ('winner', 'loser')`),
    check("diary_entries_pick", sql`${t.pickWinner} in ('winner', 'loser')`),
  ],
);

// A saga shared by link. No row: not shared. A new slug replaces the old one, which stops working.
export const sagaShares = pgTable("saga_shares", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  createdAt: createdAt(),
});
