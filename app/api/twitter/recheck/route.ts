import { NextResponse } from 'next/server'
import { getTwitterConfig, refreshAccessToken, getCurrentUser, getUserByUsername, appIsFollowing, appFindRecentTweetContaining } from '../../../lib/twitter'
import { getLatestTwitterVerificationDB, addTwitterVerificationDB, getTwitterTokensDB, saveTwitterTokensDB } from '../../../db/client'
import { getLatestTwitterVerificationMem, getTwitterTokens, saveTwitterTokens, upsertTwitterVerificationMem } from '../../../lib/memdb'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { address } = await req.json()
    if (!address || typeof address !== 'string') return NextResponse.json({ error: 'address required' }, { status: 400 })

    console.log('[RECHECK] Starting for address:', address)

    const { clientId, appHandle, requiredPhrase } = getTwitterConfig()
    console.log('[RECHECK] Config:', { appHandle, requiredPhrase })

    // Get user's OAuth tokens
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
      try {
        const xtok = cookies().get('xtok')?.value
        if (xtok) {
          const parsed = JSON.parse(decodeURIComponent(xtok)) as any
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

    if (!tokens) {
      return NextResponse.json({ error: 'not_connected', message: 'Please connect your Twitter account first' }, { status: 400 })
    }

    console.log('[RECHECK] Has tokens, checking expiry...')

    // Refresh if expired
    const now = Date.now()
    if (tokens.expiresAt && tokens.expiresAt - now < 60_000 && tokens.refreshToken) {
      try {
        console.log('[RECHECK] Refreshing token...')
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
      } catch (e: any) {
        console.error('[RECHECK] Token refresh failed:', e?.message)
      }
    }

    // Get current user
    console.log('[RECHECK] Getting current user...')
    const me = await getCurrentUser(tokens.accessToken)
    const userId = me.data.id
    const handle = me.data.username
    console.log('[RECHECK] User:', { handle, userId })

    // Check follow and tweet using Bearer token (App-Only)
    let followed = false
    let tweetId: string | null = null
    let followErr: string | null = null
    let tweetErr: string | null = null

    console.log('[RECHECK] Checking follow status with Bearer token...')
    try {
      const target = await getUserByUsername(tokens.accessToken, appHandle)
      console.log('[RECHECK] Target user:', target.data)
      followed = await appIsFollowing(userId, target.data.id)
      console.log('[RECHECK] Follow result:', followed)
    } catch (e: any) {
      followErr = e?.message || 'follow_check_failed'
      console.error('[RECHECK] Follow check error:', followErr)
    }

    console.log('[RECHECK] Checking tweet with Bearer token...')
    try {
      tweetId = await appFindRecentTweetContaining(handle, requiredPhrase)
      console.log('[RECHECK] Tweet result:', tweetId)
    } catch (e: any) {
      tweetErr = e?.message || 'tweet_check_failed'
      console.error('[RECHECK] Tweet check error:', tweetErr)
    }

    const points = (followed ? 10 : 0) + (tweetId ? 10 : 0)
    console.log('[RECHECK] Final points:', points)

    // Persist
    upsertTwitterVerificationMem({ walletId: address, twitterUserId: userId, handle, followedJoinFroggys: followed, ribbitTweeted: !!tweetId, ribbitTweetId: tweetId || undefined, points, verifiedAt: Date.now() })
    try {
      await addTwitterVerificationDB({ walletId: address, twitterUserId: userId, handle, followedJoinFroggys: followed, ribbitTweeted: !!tweetId, ribbitTweetId: tweetId || undefined, points, verifiedAt: new Date() })
    } catch (e: any) {
      console.error('[RECHECK] DB save error:', e?.message)
    }

    return NextResponse.json({ ok: true, handle, followedJoinFroggys: followed, ribbitTweeted: !!tweetId, ribbitTweetId: tweetId, points, debug: { followErr, tweetErr } })
  } catch (e: any) {
    console.error('[RECHECK] Fatal error:', e?.message, e?.stack)
    return NextResponse.json({ error: e?.message || 'failed', stack: e?.stack }, { status: 500 })
  }
}
