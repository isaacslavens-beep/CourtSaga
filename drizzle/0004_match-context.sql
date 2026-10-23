ALTER TABLE "matches" ADD COLUMN "winner_seed" smallint;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "winner_entry" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "winner_rank" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "winner_points" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "winner_age" real;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "loser_seed" smallint;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "loser_entry" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "loser_rank" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "loser_points" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "loser_age" real;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "winner_stats" smallint[];--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "loser_stats" smallint[];--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "hand" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "height" smallint;--> statement-breakpoint
CREATE INDEX "matches_event_idx" ON "matches" USING btree ("tour","event");--> statement-breakpoint
CREATE INDEX "matches_tourney_idx" ON "matches" USING btree ("tour","tourney_id");--> statement-breakpoint
CREATE INDEX "matches_peer_idx" ON "matches" USING btree ("tour","tier","round");