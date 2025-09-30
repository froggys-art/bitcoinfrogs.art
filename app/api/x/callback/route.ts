import { NextResponse } from 'next/server'
import { exchangeCodeForToken, getTwitterConfig, getUserByUsername, isFollowing, findRecentTweetContaining, getCurrentUser, repliedRibbitToTargetTweetApp } from '../../../lib/twitter'
import { addTwitterVerificationDB, logEventDB, saveTwitterTokensDB, upsertWalletDB, upsertUserDB, ensureLeaderboardRowDB, hasScoreEventDB, awardPointsDB } from '../../../db/client'
import { logEvent, popTwitterOAuthState, saveTwitterTokens, upsertTwitterVerificationMem, upsertWallet } from '../../../lib/memdb'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code') || ''
    const state = url.searchParams.get('state') || ''
    if (!code || !state) return NextResponse.json({ error: 'missing_code_or_state' }, { status: 400 })

    let stateObj = popTwitterOAuthState(state)
    if (!stateObj) {
      // Fallback: read HttpOnly cookie set during /start
      const xoauth = cookies().get('xoauth')?.value || ''
      if (xoauth) {
        const [cState, cVerifier, cAddressEnc] = xoauth.split('.')
        if (cState && cVerifier && cAddressEnc && cState === state) {
          stateObj = { state: cState, codeVerifier: cVerifier, walletId: decodeURIComponent(cAddressEnc), createdAt: Date.now() } as any
          logEvent('x_state_cookie_fallback', { state })
        }
      }
      if (!stateObj) return NextResponse.json({ error: 'state_not_found' }, { status: 400 })
    }

    const { clientId, redirectUri, appHandle, requiredPhrase } = getTwitterConfig()
    const token = await exchangeCodeForToken({ clientId, code, codeVerifier: stateObj.codeVerifier, redirectUri })

    let userId: string | undefined
    let handle: string | undefined
    try {
      const me = await getCurrentUser(token.access_token)
      userId = me.data.id
      handle = me.data.username
    } catch (e: any) {
      // Log and continue; we'll still set tokens and redirect, allowing /recheck to try later
      try { await logEventDB('x_callback_me_failed', { error: e?.message }, stateObj.walletId) } catch {}
    }

    // Save tokens for recheck (in-memory only)
    const expiresAtMs = Date.now() + (Number(token.expires_in || 0) * 1000)
    saveTwitterTokens(stateObj.walletId, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: expiresAtMs,
    })
    try {
      await saveTwitterTokensDB({
        walletId: stateObj.walletId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(expiresAtMs),
      })
    } catch (e: any) {
      // Non-fatal: continue with cookie + in-memory tokens
      try { await logEventDB('x_tokens_db_save_failed', { error: e?.message }, stateObj.walletId) } catch {}
    }

    // Ensure wallet exists
    upsertWallet(stateObj.walletId, 'unisat')
    await upsertWalletDB(stateObj.walletId, 'unisat')

    // Check follow and tweet only if we have user context
    if (userId && handle) {
      let followed = false
      let tweetId: string | null = null
      try {
        const target = await getUserByUsername(token.access_token, appHandle)
        followed = await isFollowing(token.access_token, userId, target.data.id)
      } catch {}
      try {
        tweetId = await findRecentTweetContaining(token.access_token, userId, requiredPhrase)
      } catch {}

      const points = (followed ? 10 : 0) + (tweetId ? 10 : 0)

      // Persist
      upsertTwitterVerificationMem({ walletId: stateObj.walletId, twitterUserId: userId, handle, followedJoinFroggys: followed, ribbitTweeted: !!tweetId, ribbitTweetId: tweetId || undefined, points, verifiedAt: Date.now() })
      try {
        await addTwitterVerificationDB({ walletId: stateObj.walletId, twitterUserId: userId, handle, followedJoinFroggys: followed, ribbitTweeted: !!tweetId, ribbitTweetId: tweetId || undefined, points, verifiedAt: new Date() })
      } catch {}

      // Leaderboard: upsert user, ensure row, and award one-time points
      try {
        await upsertUserDB({ twitterUserId: userId, twitterHandle: handle, walletId: stateObj.walletId })
        await ensureLeaderboardRowDB(userId)
        if (followed && !(await hasScoreEventDB(userId, 'follow_ok'))) {
          await awardPointsDB(userId, 'follow_ok', 1)
        }
        const targetTweetId = process.env.TARGET_TWEET_ID
        let replyOkTweetId: string | null = null
        if (targetTweetId) {
          try {
            const rep = await repliedRibbitToTargetTweetApp(handle, targetTweetId)
            replyOkTweetId = rep?.tweet_id || null
          } catch {}
        }
        if (replyOkTweetId && !(await hasScoreEventDB(userId, 'reply_ok'))) {
          await awardPointsDB(userId, 'reply_ok', 1, { tweetId: replyOkTweetId })
        }
      } catch {}

      logEvent('x_callback', { walletId: stateObj.walletId, handle, followed, tweetId })
      try { await logEventDB('x_callback', { walletId: stateObj.walletId, handle, followed, tweetId }, stateObj.walletId) } catch {}
    }

    // Redirect back to home with a flag, set token cookie for fallback, clear xoauth cookie
    const res = NextResponse.redirect(new URL(`/?x=ok&address=${encodeURIComponent(stateObj.walletId)}`, req.url))
    const isSecure = new URL(req.url).protocol === 'https:'
    try {
      const payload = {
        walletId: stateObj.walletId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: expiresAtMs,
      }
      const value = encodeURIComponent(JSON.stringify(payload))
      res.cookies.set('xtok', value, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      })
    } catch {}
    res.cookies.set('xoauth', '', { path: '/', maxAge: 0, sameSite: 'lax' })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
