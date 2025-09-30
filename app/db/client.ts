import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { wallets, verifications, auditLogs, verifySessions, claims, twitterVerifications, twitterTokens, users, leaderboard, scoreEvents } from './schema'
import { and, eq, gt, sql, isNotNull } from 'drizzle-orm'

const DATABASE_URL = process.env.DATABASE_URL

let pool: any = null
let dbInstance: any = null

if (DATABASE_URL) {
  const useSSL = /sslmode=require/i.test(DATABASE_URL) || /neon\.tech/i.test(DATABASE_URL)
  pool = new Pool({ connectionString: DATABASE_URL, ssl: useSSL ? { rejectUnauthorized: false } : undefined })
  dbInstance = drizzle(pool)
}

export async function saveTwitterTokensDB(params: {
  walletId: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}) {
  if (!db) return
  const now = new Date()
  await db
    .insert(twitterTokens)
    .values({
      walletId: params.walletId,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: twitterTokens.walletId,
      set: {
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        expiresAt: params.expiresAt,
        updatedAt: now,
      },
    })
}

export async function getTwitterTokensDB(walletId: string) {
  if (!db) return null
  const rows = await db.select().from(twitterTokens).where(eq(twitterTokens.walletId, walletId)).limit(1)
  return rows[0] || null
}

export async function addTwitterVerificationDB(params: {
  walletId: string
  twitterUserId?: string
  handle?: string
  followedJoinFroggys?: boolean
  ribbitTweeted?: boolean
  ribbitTweetId?: string
  points?: number
  verifiedAt?: Date
}) {
  if (!db) return
  const id = `${params.walletId}:${Date.now()}`
  await db.insert(twitterVerifications).values({
    id,
    walletId: params.walletId,
    twitterUserId: params.twitterUserId,
    handle: params.handle,
    followedJoinFroggys: params.followedJoinFroggys,
    ribbitTweeted: params.ribbitTweeted,
    ribbitTweetId: params.ribbitTweetId,
    points: params.points,
    verifiedAt: params.verifiedAt,
  })
  return id
}

export async function getLatestTwitterVerificationDB(walletId: string) {
  if (!db) return null
  const rows = await db
    .select()
    .from(twitterVerifications)
    .where(eq(twitterVerifications.walletId, walletId))
    .orderBy(twitterVerifications.createdAt as any)
  return rows[rows.length - 1] || null
}

export const db = dbInstance

export async function upsertWalletDB(address: string, provider: 'unisat' | 'okx' | 'xverse') {
  if (!db) return
  const now = new Date()
  // Upsert by id
  await db
    .insert(wallets)
    .values({ id: address, provider, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: wallets.id,
      set: { provider, updatedAt: now },
    })
}

export async function addVerificationDB(params: {
  walletId: string
  status: 'connected' | 'verified'
  holdCount?: number
  frogNumbers?: number[]
  reservedText?: string
  verifiedAt?: Date
}) {
  if (!db) return
  const id = `${params.walletId}:${Date.now()}`
  await db.insert(verifications).values({
    id,
    walletId: params.walletId,
    status: params.status,
    holdCount: params.holdCount,
    frogNumbers: params.frogNumbers as any,
    reservedText: params.reservedText,
    verifiedAt: params.verifiedAt,
  })
  return id
}

export async function logEventDB(type: string, payload?: any, walletId?: string) {
  if (!db) return
  const id = `${type}:${Date.now()}`
  await db.insert(auditLogs).values({ id, type, walletId, payload })
}

export async function createVerifySessionDB(walletId: string, nonce: string, expiresAt?: Date) {
  if (!db) return
  const id = `${walletId}:${nonce}`
  await db
    .insert(verifySessions)
    .values({ id, walletId, nonce, status: 'pending', expiresAt })
    .onConflictDoNothing()
}

export async function getVerifySessionDB(walletId: string, nonce: string) {
  if (!db) return null
  const id = `${walletId}:${nonce}`
  const rows = await db.select().from(verifySessions).where(eq(verifySessions.id, id)).limit(1)
  return rows[0] || null
}

export async function markVerifySessionUsedDB(walletId: string, nonce: string) {
  if (!db) return
  const id = `${walletId}:${nonce}`
  await db.update(verifySessions).set({ status: 'used', usedAt: new Date() }).where(eq(verifySessions.id, id))
}

export async function claimFrogsForWalletDB(walletId: string, frogNums: number[]): Promise<{ conflicts: number[] }> {
  if (!db) return { conflicts: [] }
  const conflicts: number[] = []
  for (const n of frogNums) {
    await db.insert(claims).values({ frogNum: n, walletId }).onConflictDoNothing()
    const row = await db.select().from(claims).where(eq(claims.frogNum, n)).limit(1)
    const owner = row[0]?.walletId
    if (owner && owner !== walletId) conflicts.push(n)
  }
  return { conflicts }
}

// ---------------- Social-Fi: Users & Leaderboard helpers ----------------

export async function upsertUserDB(params: {
  twitterUserId: string
  twitterHandle: string
  twitterName?: string
  twitterAvatarUrl?: string
  walletId?: string
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: Date
}) {
  if (!db) return
  const now = new Date()
  await db
    .insert(users)
    .values({
      id: params.twitterUserId,
      createdAt: now,
      updatedAt: now,
      walletId: params.walletId,
      twitterUserId: params.twitterUserId,
      twitterHandle: params.twitterHandle,
      twitterName: params.twitterName,
      twitterAvatarUrl: params.twitterAvatarUrl,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      tokenExpiresAt: params.tokenExpiresAt,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        updatedAt: now,
        walletId: params.walletId ?? sql`COALESCE(${users.walletId}, ${params.walletId})`,
        twitterHandle: params.twitterHandle,
        twitterName: params.twitterName,
        twitterAvatarUrl: params.twitterAvatarUrl,
        accessToken: params.accessToken ?? sql`${users.accessToken}`,
        refreshToken: params.refreshToken ?? sql`${users.refreshToken}`,
        tokenExpiresAt: params.tokenExpiresAt ?? sql`${users.tokenExpiresAt}`,
      },
    })
}

export async function markUsersVerifiedByWalletDB(walletId: string) {
  if (!db) return
  const now = new Date()
  // Mark all users linked to wallet as verified
  await db.update(users).set({ isVerified: true, verifiedAt: now, updatedAt: now }).where(eq(users.walletId, walletId))
}

export async function ensureLeaderboardRowDB(userId: string) {
  if (!db) return
  const now = new Date()
  await db
    .insert(leaderboard)
    .values({ id: userId, userId, points: 0, createdAt: now, updatedAt: now })
    .onConflictDoNothing()
}

export async function hasScoreEventDB(userId: string, type: string) {
  if (!db) return false
  const rows = await db.select().from(scoreEvents).where(and(eq(scoreEvents.userId, userId), eq(scoreEvents.type, type))).limit(1)
  return !!rows[0]
}

export async function alreadyAwardedInWindowDB(userId: string, type: string, since: Date) {
  if (!db) return false
  const rows = await db
    .select()
    .from(scoreEvents)
    .where(and(eq(scoreEvents.userId, userId), eq(scoreEvents.type, type), gt(scoreEvents.createdAt as any, since)))
    .limit(1)
  return !!rows[0]
}

export async function awardPointsDB(userId: string, type: 'follow_ok' | 'reply_ok' | 'ribbit' | 'ribbit_tag', delta: number, opts?: { tweetId?: string; notes?: string }) {
  if (!db) return
  const now = new Date()
  await db.transaction(async (tx: any) => {
    const id = `${userId}:${type}:${Date.now()}`
    await tx.insert(scoreEvents).values({ id, userId, type, delta, tweetId: opts?.tweetId, notes: opts?.notes, createdAt: now })
    // increment points
    await tx
      .update(leaderboard)
      .set({ points: sql`${leaderboard.points} + ${delta}`, updatedAt: now })
      .where(eq(leaderboard.userId, userId))
  })
}

export async function getLeaderboardPageDB(limit = 100, offset = 0) {
  if (!db) return { rows: [], nextOffset: undefined as number | undefined }
  const rows = (await db.execute(sql`
    SELECT u.twitter_handle AS handle, l.points
    FROM ${leaderboard} l
    JOIN ${users} u ON u.id = l.user_id
    ORDER BY l.points DESC, l.updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `)) as any
  const arr: Array<{ handle: string; points: number }> = rows?.rows || []
  const nextOffset = arr.length === limit ? offset + limit : undefined
  return { rows: arr, nextOffset }
}

export async function getLeaderboardMeDB(userId: string) {
  if (!db) return null
  const myRows = await db.execute(sql`
    SELECT l.points, l.updated_at, l.last_scan_at, u.twitter_handle AS handle
    FROM ${leaderboard} l JOIN ${users} u ON u.id = l.user_id
    WHERE l.user_id = ${userId}
    LIMIT 1
  `)
  const my = (myRows as any)?.rows?.[0]
  if (!my) return null
  const aheadRows = await db.execute(sql`
    SELECT COUNT(*) AS ahead
    FROM ${leaderboard} l2
    WHERE (l2.points > ${my.points}) OR (l2.points = ${my.points} AND l2.updated_at > ${my.updated_at})
  `)
  const ahead = Number((aheadRows as any)?.rows?.[0]?.ahead || 0)
  return { handle: my.handle as string, points: Number(my.points), rank: ahead + 1, lastScanAt: my.last_scan_at ? new Date(my.last_scan_at as any).toISOString() : undefined }
}

export async function getVerifiedUsersForScanDB() {
  if (!db) return [] as Array<{ id: string; handle: string }>
  const rows = await db.execute(sql`
    SELECT id, twitter_handle AS handle
    FROM ${users}
    WHERE is_verified = true
  `)
  const arr = ((rows as any)?.rows || []) as Array<{ id: string; handle: string }>
  return arr
}

export async function getUserIdByHandleDB(handle: string) {
  if (!db) return null
  const rows = await db.select().from(users).where(eq(users.twitterHandle, handle)).limit(1)
  return rows[0]?.id || null
}

export async function getUserIdsByWalletDB(walletId: string) {
  if (!db) return [] as string[]
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.walletId, walletId))
  return rows.map((r: any) => r.id as string)
}

export async function updateLeaderboardScanMarksDB(userId: string, data: { lastScanAt?: Date; lastRibbitAt?: Date; lastTaggedRibbitAt?: Date }) {
  if (!db) return
  const now = new Date()
  await db
    .update(leaderboard)
    .set({
      updatedAt: now,
      lastScanAt: data.lastScanAt ?? (sql`${leaderboard.lastScanAt}` as any),
      lastRibbitAt: data.lastRibbitAt ?? (sql`${leaderboard.lastRibbitAt}` as any),
      lastTaggedRibbitAt: data.lastTaggedRibbitAt ?? (sql`${leaderboard.lastTaggedRibbitAt}` as any),
    })
    .where(eq(leaderboard.userId, userId))
}

// Sync function to migrate twitterVerifications data to Social-Fi tables
export async function syncTwitterVerificationsToSocialFi() {
  if (!db) return { synced: 0, errors: 0 }
  
  let synced = 0
  let errors = 0
  
  try {
    // Get all Twitter verifications with valid data
    const verifications = await db
      .select()
      .from(twitterVerifications)
      .where(and(
        isNotNull(twitterVerifications.twitterUserId),
        isNotNull(twitterVerifications.handle),
        isNotNull(twitterVerifications.points)
      ))
    
    for (const verification of verifications) {
      try {
        const now = new Date()
        const userId = verification.twitterUserId!
        const handle = verification.handle!
        const points = verification.points || 0
        
        // Insert or update user record
        await db
          .insert(users)
          .values({
            id: userId,
            twitterUserId: userId,
            twitterHandle: handle,
            walletId: verification.walletId,
            isVerified: true,
            verifiedAt: verification.verifiedAt || now,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              twitterHandle: handle,
              walletId: verification.walletId,
              isVerified: true,
              verifiedAt: verification.verifiedAt || now,
              updatedAt: now,
            },
          })
        
        // Insert or update leaderboard record
        await db
          .insert(leaderboard)
          .values({
            id: userId,
            userId,
            points,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: leaderboard.id,
            set: {
              points,
              updatedAt: now,
            },
          })
        
        synced++
      } catch (e) {
        console.error('Error syncing verification:', verification.id, e)
        errors++
      }
    }
    
    return { synced, errors }
  } catch (e: any) {
    console.error('Error in syncTwitterVerificationsToSocialFi:', e)
    return { synced, errors: errors + 1 }
  }
}
