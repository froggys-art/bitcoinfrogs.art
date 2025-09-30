import { NextResponse } from 'next/server'
import { getTwitterConfig, refreshAccessToken, getCurrentUser, getUserByUsername, isFollowing, findRecentTweetContaining } from '../../../lib/twitter'
import { getLatestTwitterVerificationDB, addTwitterVerificationDB, getTwitterTokensDB, saveTwitterTokensDB } from '../../../db/client'
import { getLatestTwitterVerificationMem, getTwitterTokens, saveTwitterTokens, upsertTwitterVerificationMem } from '../../../lib/memdb'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { address } = await req.json()
    if (!address || typeof address !== 'string') return NextResponse.json({ error: 'address required' }, { status: 400 })

    const { clientId, appHandle, requiredPhrase } = getTwitterConfig()

    // Retrieve tokens
    let tokens = getTwitterTokens(address)
    if (!tokens) {
      const row = await getTwitterTokensDB(address)
      if (row?.accessToken) {
        tokens = {
          accessToken: row.accessToken as string,
          refreshToken: (row as any).refreshToken || undefined,
          expiresAt: row.expiresAt ? new Date(row.expiresAt as any).getTime() : undefined,
        }
        saveTwitterTokens(address, tokens)
      }
    }
    if (!tokens) {
      // Fallback to cookie set at callback
      try {
        const xtok = cookies().get('xtok')?.value
        if (xtok) {
          const parsed = JSON.parse(decodeURIComponent(xtok)) as {
            walletId: string
            accessToken: string
            refreshToken?: string
            expiresAt?: number
          }
          if (parsed?.walletId === address && parsed.accessToken) {
            tokens = {
              accessToken: parsed.accessToken,
              refreshToken: parsed.refreshToken,
              expiresAt: parsed.expiresAt,
            }
            saveTwitterTokens(address, tokens)
            await saveTwitterTokensDB({
              walletId: address,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : undefined,
            })
          }
        }
      } catch {}
    }
    if (!tokens) return NextResponse.json({ error: 'not_connected' }, { status: 400 })

    // Refresh if expired/near-expiry and we have a refresh token
    const now = Date.now()
    if (tokens.expiresAt && tokens.expiresAt - now < 60_000 && tokens.refreshToken) {
      try {
        const refreshed = await refreshAccessToken({ clientId, refreshToken: tokens.refreshToken })
        tokens = {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || tokens.refreshToken,
          expiresAt: Date.now() + (Number(refreshed.expires_in || 0) * 1000),
        }
        saveTwitterTokens(address, tokens)
        await saveTwitterTokensDB({
          walletId: address,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : undefined,
        })
      } catch {}
    }

    // Re-check follow and tweet
    const me = await getCurrentUser(tokens.accessToken)
    const userId = me.data.id
    const handle = me.data.username

    let followed = false
    let tweetId: string | null = null
    let followErr: string | null = null
    let tweetErr: string | null = null
    try {
      const target = await getUserByUsername(tokens.accessToken, appHandle)
      followed = await isFollowing(tokens.accessToken, userId, target.data.id)
    } catch (e: any) {
      followErr = e?.message || 'follow_check_failed'
    }
    try {
      tweetId = await findRecentTweetContaining(tokens.accessToken, userId, requiredPhrase)
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
