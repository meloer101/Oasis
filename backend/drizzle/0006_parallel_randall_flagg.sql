DROP INDEX "idx_votes_unique";--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_votes_active_unique" ON "votes" USING btree ("voter_id","post_id") WHERE "votes"."status" = 'active';