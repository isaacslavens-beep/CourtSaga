ALTER TABLE "diary_entries" DROP CONSTRAINT "diary_entries_pick";--> statement-breakpoint
ALTER TABLE "diary_entries" DROP COLUMN "pick_sets";--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_pick" CHECK ("diary_entries"."pick_winner" in ('winner', 'loser'));