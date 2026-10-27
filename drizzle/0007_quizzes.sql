CREATE TABLE "quizzes" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"user_id" text,
	"name" text,
	"difficulty" text NOT NULL,
	"settings" jsonb NOT NULL,
	"questions" jsonb NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correct" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quizzes_owner_idx" ON "quizzes" USING btree ("owner","created_at");--> statement-breakpoint
CREATE INDEX "quizzes_finished_idx" ON "quizzes" USING btree ("difficulty","finished_at");