import { pgTable, varchar, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const wallets = pgTable('wallets', {
  id: varchar('id', { length: 100 }).primaryKey(), // address
  provider: varchar('provider', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
})

export const verifications = pgTable('verifications', {
  id: varchar('id', { length: 120 }).primaryKey(),
  walletId: varchar('wallet_id', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // connected | verified
  holdCount: integer('hold_count'),
  frogNumbers: jsonb('frog_numbers'), // number[]
  reservedText: text('reserved_text'),
  verifiedAt: timestamp('verified_at', { withTimezone: false }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

export const holdings = pgTable('holdings', {
  id: varchar('id', { length: 140 }).primaryKey(), // `${walletId}:${frogNum}`
  walletId: varchar('wallet_id', { length: 100 }).notNull(),
  frogNum: integer('frog_num').notNull(),
  inscriptionId: text('inscription_id'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

export const twitterVerifications = pgTable('twitter_verifications', {
  id: varchar('id', { length: 120 }).primaryKey(),
  walletId: varchar('wallet_id', { length: 100 }).notNull(),
  twitterUserId: varchar('twitter_user_id', { length: 50 }),
  handle: varchar('handle', { length: 50 }),
  followedJoinFroggys: boolean('followed_joinfroggys'),
  ribbitTweeted: boolean('ribbit_tweeted'),
  ribbitTweetId: varchar('ribbit_tweet_id', { length: 60 }),
  points: integer('points'),
  verifiedAt: timestamp('verified_at', { withTimezone: false }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 140 }).primaryKey(),
  walletId: varchar('wallet_id', { length: 100 }),
  type: varchar('type', { length: 60 }).notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

export const verifySessions = pgTable('verify_sessions', {
  id: varchar('id', { length: 160 }).primaryKey(), // `${walletId}:${nonce}`
  walletId: varchar('wallet_id', { length: 100 }).notNull(),
  nonce: varchar('nonce', { length: 64 }).notNull(),
  status: varchar('status', { length: 16 }).notNull(), // pending | used
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: false }),
  usedAt: timestamp('used_at', { withTimezone: false }),
})

export const claims = pgTable('claims', {
  frogNum: integer('frog_num').primaryKey(), // unique claim per frog
  walletId: varchar('wallet_id', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

export const twitterTokens = pgTable('twitter_tokens', {
  walletId: varchar('wallet_id', { length: 100 }).primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: false }),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
})

// --- Social-Fi: Users (Twitter) ---
// Note: We use twitter_user_id (string) as the primary key for simplicity.
export const users = pgTable('users', {
  id: varchar('id', { length: 60 }).primaryKey(), // twitter_user_id
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),

  // Optional associations
  walletId: varchar('wallet_id', { length: 100 }), // local wallet address, if linked

  // Twitter profile
  twitterUserId: varchar('twitter_user_id', { length: 60 }).notNull(), // duplicate of id for clarity
  twitterHandle: varchar('twitter_handle', { length: 50 }).notNull(),
  twitterName: varchar('twitter_name', { length: 100 }),
  twitterAvatarUrl: text('twitter_avatar_url'),

  // OAuth tokens (optional; only if needed)
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: false }),

  // Verification state (site-level verification)
  isVerified: boolean('is_verified').notNull().default(false),
  verifiedAt: timestamp('verified_at', { withTimezone: false }),
})

// --- Social-Fi: Leaderboard ---
export const leaderboard = pgTable('leaderboard', {
  id: varchar('id', { length: 120 }).primaryKey(), // `${user_id}`
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),

  userId: varchar('user_id', { length: 60 }).notNull(), // references users.id
  points: integer('points').notNull().default(0),
  lastScanAt: timestamp('last_scan_at', { withTimezone: false }),
  lastRibbitAt: timestamp('last_ribbit_at', { withTimezone: false }),
  lastTaggedRibbitAt: timestamp('last_tagged_ribbit_at', { withTimezone: false }),
})

// --- Social-Fi: Score Events (audit trail + idempotency) ---
export const scoreEvents = pgTable('score_events', {
  id: varchar('id', { length: 140 }).primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),

  userId: varchar('user_id', { length: 60 }).notNull(), // references users.id
  type: varchar('type', { length: 40 }).notNull(), // 'follow_ok' | 'reply_ok' | 'ribbit' | 'ribbit_tag'
  delta: integer('delta').notNull(),
  tweetId: varchar('tweet_id', { length: 60 }),
  notes: text('notes'),
})
