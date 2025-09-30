import { NextResponse } from 'next/server'
import { alreadyAwardedInWindowDB, awardPointsDB, ensureLeaderboardRowDB, getVerifiedUsersForScanDB, updateLeaderboardScanMarksDB } from '../../../db/client'
import { findRibbitTaggedTweetApp, findRibbitTweetApp } from '../../../lib/x'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const secret = process.env.CRON_SECRET || ''
    const url = new URL(req.url)
    const auth = url.searchParams.get('secret') || req.headers.get('x-cron-secret') || ''
    if (!secret || auth !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const intervalHours = Number(process.env.SCAN_INTERVAL_HOURS || 12)
    const target = (process.env.TARGET_ACCOUNT || process.env.X_APP_HANDLE || 'JoinFroggys').replace(/^@/, '')

    const since = new Date(Date.now() - intervalHours * 3600 * 1000)
    const users = await getVerifiedUsersForScanDB()

    let scanned = 0
    let updated = 0
    let errors = 0

    for (const u of users) {
      scanned++
      try {
        await ensureLeaderboardRowDB(u.id)
        // periodic ribbit
        const ribbit = await findRibbitTweetApp(u.handle, since)
        if (ribbit && !(await alreadyAwardedInWindowDB(u.id, 'ribbit', since))) {
          await awardPointsDB(u.id, 'ribbit', 1, { tweetId: ribbit.id })
          await updateLeaderboardScanMarksDB(u.id, { lastRibbitAt: new Date(ribbit.created_at) })
          updated++
        }
        // periodic tag bonus
        const ribbitTag = await findRibbitTaggedTweetApp(u.handle, target, since)
        if (ribbitTag && !(await alreadyAwardedInWindowDB(u.id, 'ribbit_tag', since))) {
          await awardPointsDB(u.id, 'ribbit_tag', 1, { tweetId: ribbitTag.id })
          await updateLeaderboardScanMarksDB(u.id, { lastTaggedRibbitAt: new Date(ribbitTag.created_at) })
          updated++
        }
        await updateLeaderboardScanMarksDB(u.id, { lastScanAt: new Date() })
      } catch (e) {
        errors++
      }
    }

    return NextResponse.json({ scanned, updated, errors })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
