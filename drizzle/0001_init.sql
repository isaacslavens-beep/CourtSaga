CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diary_entries" (
	"user_id" text NOT NULL,
	"match_id" text NOT NULL,
	"watched_on" text NOT NULL,
	"watched_date" text NOT NULL,
	"sets_seen" smallint[] NOT NULL,
	"rating" smallint NOT NULL,
	"cheering" text,
	"pick_winner" text,
	"pick_sets" smallint,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"classic" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diary_entries_user_id_match_id_pk" PRIMARY KEY("user_id","match_id"),
	CONSTRAINT "diary_entries_rating" CHECK ("diary_entries"."rating" between 1 and 5),
	CONSTRAINT "diary_entries_watched_on" CHECK ("diary_entries"."watched_on" in ('Live', 'TV', 'Stream')),
	CONSTRAINT "diary_entries_watched_date" CHECK ("diary_entries"."watched_date" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "diary_entries_cheering" CHECK ("diary_entries"."cheering" in ('winner', 'loser')),
	CONSTRAINT "diary_entries_pick" CHECK ("diary_entries"."pick_winner" in ('winner', 'loser') and "diary_entries"."pick_sets" between 1 and 5 or "diary_entries"."pick_winner" is null and "diary_entries"."pick_sets" is null)
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"tour" text NOT NULL,
	"season" smallint NOT NULL,
	"tourney_id" text NOT NULL,
	"tourney_name" text NOT NULL,
	"event" text NOT NULL,
	"stage" text,
	"level" text NOT NULL,
	"tier" text NOT NULL,
	"surface" text NOT NULL,
	"indoor" boolean,
	"draw_size" smallint,
	"start_date" date NOT NULL,
	"played_on" date NOT NULL,
	"round" text NOT NULL,
	"match_num" integer,
	"winner_id" text NOT NULL,
	"loser_id" text NOT NULL,
	"score" text NOT NULL,
	"best_of" smallint NOT NULL,
	"outcome" text NOT NULL,
	"minutes" integer,
	"searchable" boolean NOT NULL,
	"search" "tsvector" NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"tour" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"ioc" text,
	"search_name" text NOT NULL,
	"match_count" integer NOT NULL,
	"last_seen" date NOT NULL,
	CONSTRAINT "players_tour_id_pk" PRIMARY KEY("tour","id")
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "saga_shares" (
	"user_id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saga_shares_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_fk" FOREIGN KEY ("tour","winner_id") REFERENCES "public"."players"("tour","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_loser_fk" FOREIGN KEY ("tour","loser_id") REFERENCES "public"."players"("tour","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saga_shares" ADD CONSTRAINT "saga_shares_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "diary_entries_match_idx" ON "diary_entries" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "matches_search_idx" ON "matches" USING gin ("search");--> statement-breakpoint
CREATE INDEX "matches_winner_idx" ON "matches" USING btree ("tour","winner_id","loser_id");--> statement-breakpoint
CREATE INDEX "matches_loser_idx" ON "matches" USING btree ("tour","loser_id","winner_id");--> statement-breakpoint
CREATE INDEX "matches_played_idx" ON "matches" USING btree ("played_on");--> statement-breakpoint
CREATE INDEX "players_search_name_idx" ON "players" USING gin ("search_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");