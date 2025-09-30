import { NextResponse } from 'next/server'
import { getTwitterConfig, appGetUserByUsername, appIsFollowing, appFindRecentTweetContaining } from '../../../lib/twitter'
import { getLatestTwitterVerificationDB, addTwitterVerificationDB, getTwitterTokensDB, saveTwitterTokensDB } from '../../../db/client'
import { getLatestTwitterVerificationMem, getTwitterTokens, saveTwitterTokens, upsertTwitterVerificationMem } from '../../../lib/memdb'

export async function POST(req: Request) {
  try {
    const { address } = await req.json()
    if (!address || typeof address !== 'string') return NextResponse.json({ error: 'address required' }, { status: 400 })

    const { appHandle, requiredPhrase } = getTwitterConfig()

    // Get the user's Twitter handle from stored tokens/verification
    let handle: string | undefined
    let userId: string | undefined

    // Try to get from stored tokens first
    const tokens = await getTwitterTokensDB(address)
    if (tokens?.accessToken) {
      // We have tokens but won't use them - just need to get the handle
      const latestVerif = await getLatestTwitterVerificationDB(address)
      if (latestVerif?.handle && latestVerif?.twitterUserId) {
        handle = latestVerif.handle
        userId = latestVerif.twitterUserId
      }
    }

    // If we don't have handle/userId, check memory
    if (!handle || !userId) {
      const memVerif = getLatestTwitterVerificationMem(address)
      if (memVerif?.handle && memVerif?.twitterUserId) {
        handle = memVerif.handle
        userId = memVerif.twitterUserId
      }
    }

    if (!handle || !userId) {
      return NextResponse.json({ error: 'not_connected', message: 'Please connect your Twitter account first' }, { status: 400 })
    }

    // Use App-Only authentication (Bearer token) for checks
    let followed = false
    let tweetId: string | null = null
    let followErr: string | null = null
    let tweetErr: string | null = null

    try {
      const target = await appGetUserByUsername(appHandle)
      followed = await appIsFollowing(userId, target.data.id)
    } catch (e: any) {
      followErr = e?.message || 'follow_check_failed'
    }

    try {
      tweetId = await appFindRecentTweetContaining(handle, requiredPhrase)
    } catch (e: any) {
      tweetErr = e?.message || 'tweet_check_failed'
    }

    const points = (followed ? 10 : 0) + (tweetId ? 10 : 0)

    // Persist a new record (non-fatal if DB fails)
    upsertTwitterVerificationMem({ walletId: address, twitterUserId: userId, handle, followedJoinFroggys: followed, ribbitTweeted: !!tweetId, ribbitTweetId: tweetId || undefined, points, verifiedAt: Date.now() })
    try {
      await addTwitterVerificationDB({ walletId: address, twitterUserId: userId, handle, followedJoinFroggys: followed, ribbitTweeted: !!tweetId, ribbitTweetId: tweetId || undefined, points, verifiedAt: new Date() })
    } catch (e: any) {
      // swallow; client will still get immediate status from response body
    }

    return NextResponse.json({ ok: true, handle, followedJoinFroggys: followed, ribbitTweeted: !!tweetId, ribbitTweetId: tweetId, points, debug: { followErr, tweetErr } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
