import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  decimal,
  index,
  uniqueIndex,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─────────────────────────────────────────────
// DOMAIN 1: USERS
// ─────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 100 }),
    bio: text('bio'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    founderNumber: integer('founder_number').unique(), // first 100 users only
    loginStreak: integer('login_streak').notNull().default(1),
    lastLoginDate: date('last_login_date'), // UTC date of last login (for streak tracking)
    tokenVersion: integer('token_version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // username/email already indexed by .unique()
    index('idx_users_last_active').on(t.lastActiveAt),
  ]
)

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    tokenVersion: integer('token_version').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_refresh_tokens_user').on(t.userId),
    index('idx_refresh_tokens_expires').on(t.expiresAt),
  ]
)

export const userBalances = pgTable(
  'user_balances',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    balance: bigint('balance', { mode: 'number' }).notNull().default(0),
    totalEarned: bigint('total_earned', { mode: 'number' }).notNull().default(0),
    totalSpent: bigint('total_spent', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('balance_non_negative', sql`${t.balance} >= 0`),
  ]
)

export const userBadges = pgTable(
  'user_badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeType: varchar('badge_type', { length: 50 }).notNull(),
    // newcomer | resonator | vibe_master | founder | circle_creator
    isActive: boolean('is_active').notNull().default(true),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_user_badges_user').on(t.userId),
    uniqueIndex('idx_user_badges_unique').on(t.userId, t.badgeType),
  ]
)

export const userFollows = pgTable(
  'user_follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_user_follows_unique').on(t.followerId, t.followingId),
    index('idx_user_follows_following').on(t.followingId),
  ]
)

// ─────────────────────────────────────────────
// DOMAIN 2: CONTENT
// ─────────────────────────────────────────────

export const circles = pgTable(
  'circles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => users.id),
    visibility: varchar('visibility', { length: 20 }).notNull().default('public'),
    // public | private | invite_only
    joinFee: bigint('join_fee', { mode: 'number' }).notNull().default(0),
    memberCount: integer('member_count').notNull().default(0),
    postCount: integer('post_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_circles_creator').on(t.creatorId),
    index('idx_circles_slug').on(t.slug),
  ]
)

export const circleMembers = pgTable(
  'circle_members',
  {
    circleId: uuid('circle_id')
      .notNull()
      .references(() => circles.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    // creator | admin | moderator | member
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_circle_members_unique').on(t.circleId, t.userId),
    index('idx_circle_members_user').on(t.userId),
  ]
)

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    postCount: integer('post_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // name already indexed by .unique()
    index('idx_tags_post_count').on(t.postCount),
  ]
)

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    circleId: uuid('circle_id').references(() => circles.id),
    title: varchar('title', { length: 300 }).notNull(),
    content: text('content').notNull(),
    contentType: varchar('content_type', { length: 20 }).notNull().default('markdown'),
    // markdown | link | image | rich
    linkUrl: varchar('link_url', { length: 500 }),
    imageUrl: varchar('image_url', { length: 500 }),
    status: varchar('status', { length: 20 }).notNull().default('published'),
    // published | draft | removed
    visibility: varchar('visibility', { length: 20 }).notNull().default('public'),
    // public | circle_only
    viewCount: bigint('view_count', { mode: 'number' }).notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    voterCount: integer('voter_count').notNull().default(0),
    totalVoteAmount: bigint('total_vote_amount', { mode: 'number' }).notNull().default(0),
    disagreeVoteAmount: bigint('disagree_vote_amount', { mode: 'number' }).notNull().default(0),
    impressionCount: bigint('impression_count', { mode: 'number' }).notNull().default(0),
    temperature: decimal('temperature', { precision: 10, scale: 4 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_posts_author').on(t.authorId),
    index('idx_posts_circle').on(t.circleId),
    index('idx_posts_temperature').on(t.temperature),
    index('idx_posts_created_at').on(t.createdAt),
    index('idx_posts_status').on(t.status),
  ]
)

export const postTags = pgTable(
  'post_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('idx_post_tags_unique').on(t.postId, t.tagId),
    index('idx_post_tags_tag').on(t.tagId),
  ]
)

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, {
      onDelete: 'cascade',
    }),
    content: text('content').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('published'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_comments_post').on(t.postId),
    index('idx_comments_author').on(t.authorId),
    index('idx_comments_parent').on(t.parentId),
  ]
)

export const userTagFollows = pgTable(
  'user_tag_follows',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('idx_user_tag_follows_unique').on(t.userId, t.tagId)]
)

// ─────────────────────────────────────────────
// DOMAIN 3: ECONOMY
// ─────────────────────────────────────────────

export const votes = pgTable(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    voterId: uuid('voter_id')
      .notNull()
      .references(() => users.id),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    voteType: varchar('vote_type', { length: 20 }).notNull().default('agree'),
    // agree | disagree (future)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_votes_unique').on(t.voterId, t.postId),
    index('idx_votes_post').on(t.postId),
    check('vote_amount_positive', sql`${t.amount} > 0`),
  ]
)

export const coinTransactions = pgTable(
  'coin_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id').references(() => users.id),
    // NULL = system
    toUserId: uuid('to_user_id').references(() => users.id),
    // NULL = burned
    amount: bigint('amount', { mode: 'number' }).notNull(),
    transactionType: varchar('transaction_type', { length: 50 }).notNull(),
    // daily_distribution | post_reward | comment_reward | vote_received
    // transaction_fee_burned | disagree_burned | circle_join_fee | system_mint
    // login_streak_bonus
    relatedPostId: uuid('related_post_id').references(() => posts.id),
    relatedCommentId: uuid('related_comment_id').references(() => comments.id),
    relatedVoteId: uuid('related_vote_id').references(() => votes.id),
    relatedCircleId: uuid('related_circle_id').references(() => circles.id),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_coin_tx_from_user').on(t.fromUserId),
    index('idx_coin_tx_to_user').on(t.toUserId),
    index('idx_coin_tx_type').on(t.transactionType),
    index('idx_coin_tx_created_at').on(t.createdAt),
    check('coin_tx_amount_positive', sql`${t.amount} > 0`),
  ]
)

// ─────────────────────────────────────────────
// DOMAIN 4: NOTIFICATIONS
// ─────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    // comment_on_post | vote_received | new_follower | circle_invite | badge_earned
    actorId: uuid('actor_id').references(() => users.id),
    relatedPostId: uuid('related_post_id').references(() => posts.id),
    relatedCommentId: uuid('related_comment_id').references(() => comments.id),
    relatedCircleId: uuid('related_circle_id').references(() => circles.id),
    content: text('content'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_notifications_user').on(t.userId),
    index('idx_notifications_user_unread').on(t.userId, t.isRead),
    index('idx_notifications_created_at').on(t.createdAt),
  ]
)
