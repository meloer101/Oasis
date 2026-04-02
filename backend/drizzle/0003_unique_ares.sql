ALTER TABLE "users" ADD COLUMN "login_streak" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_date" date;