CREATE TABLE "circle_members" (
	"circle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"avatar_url" varchar(500),
	"creator_id" uuid NOT NULL,
	"visibility" varchar(20) DEFAULT 'public' NOT NULL,
	"join_fee" bigint DEFAULT 0 NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circles_name_unique" UNIQUE("name"),
	CONSTRAINT "circles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "coin_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid,
	"to_user_id" uuid,
	"amount" bigint NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"related_post_id" uuid,
	"related_comment_id" uuid,
	"related_vote_id" uuid,
	"related_circle_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coin_tx_amount_positive" CHECK ("coin_transactions"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"actor_id" uuid,
	"related_post_id" uuid,
	"related_comment_id" uuid,
	"related_circle_id" uuid,
	"content" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"circle_id" uuid,
	"title" varchar(300) NOT NULL,
	"content" text NOT NULL,
	"content_type" varchar(20) DEFAULT 'markdown' NOT NULL,
	"link_url" varchar(500),
	"image_url" varchar(500),
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"visibility" varchar(20) DEFAULT 'public' NOT NULL,
	"view_count" bigint DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"voter_count" integer DEFAULT 0 NOT NULL,
	"total_vote_amount" bigint DEFAULT 0 NOT NULL,
	"impression_count" bigint DEFAULT 0 NOT NULL,
	"temperature" numeric(10, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_balances" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"total_earned" bigint DEFAULT 0 NOT NULL,
	"total_spent" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "balance_non_negative" CHECK ("user_balances"."balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tag_follows" (
	"user_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"bio" text,
	"avatar_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_active_at" timestamp with time zone,
	"founder_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_founder_number_unique" UNIQUE("founder_number")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voter_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"vote_type" varchar(20) DEFAULT 'agree' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vote_amount_positive" CHECK ("votes"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_related_post_id_posts_id_fk" FOREIGN KEY ("related_post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_related_comment_id_comments_id_fk" FOREIGN KEY ("related_comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_related_vote_id_votes_id_fk" FOREIGN KEY ("related_vote_id") REFERENCES "public"."votes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_related_circle_id_circles_id_fk" FOREIGN KEY ("related_circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_post_id_posts_id_fk" FOREIGN KEY ("related_post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_comment_id_comments_id_fk" FOREIGN KEY ("related_comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_circle_id_circles_id_fk" FOREIGN KEY ("related_circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_balances" ADD CONSTRAINT "user_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tag_follows" ADD CONSTRAINT "user_tag_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tag_follows" ADD CONSTRAINT "user_tag_follows_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_circle_members_unique" ON "circle_members" USING btree ("circle_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_circle_members_user" ON "circle_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_circles_creator" ON "circles" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_circles_slug" ON "circles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_coin_tx_from_user" ON "coin_transactions" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "idx_coin_tx_to_user" ON "coin_transactions" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "idx_coin_tx_type" ON "coin_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "idx_coin_tx_created_at" ON "coin_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_comments_post" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_comments_author" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_post_tags_unique" ON "post_tags" USING btree ("post_id","tag_id");--> statement-breakpoint
CREATE INDEX "idx_post_tags_tag" ON "post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_posts_author" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_posts_circle" ON "posts" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "idx_posts_temperature" ON "posts" USING btree ("temperature");--> statement-breakpoint
CREATE INDEX "idx_posts_created_at" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_posts_status" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tags_name" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_tags_post_count" ON "tags" USING btree ("post_count");--> statement-breakpoint
CREATE INDEX "idx_user_badges_user" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_badges_unique" ON "user_badges" USING btree ("user_id","badge_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_follows_unique" ON "user_follows" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "idx_user_follows_following" ON "user_follows" USING btree ("following_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_tag_follows_unique" ON "user_tag_follows" USING btree ("user_id","tag_id");--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_last_active" ON "users" USING btree ("last_active_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_votes_unique" ON "votes" USING btree ("voter_id","post_id");--> statement-breakpoint
CREATE INDEX "idx_votes_post" ON "votes" USING btree ("post_id");