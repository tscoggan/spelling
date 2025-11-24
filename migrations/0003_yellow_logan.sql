CREATE TABLE "user_streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"current_word_streak" integer DEFAULT 0 NOT NULL,
	"longest_word_streak" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_streaks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "game_mode" SET DEFAULT 'practice';--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "incorrect_words" text[] DEFAULT '{}'::text[] NOT NULL;