import { NextResponse } from 'next/server'
import { getXConfig, exchangeCodeForToken, getCurrentUser, getUserByUsername, isFollowing, findRecentTweetContaining } from '../../../lib/twitter'
import { addTwitterVerificationDB, saveTwitterTokensDB } from '../../../db/client'
import { saveTwitterTokens, upsertTwitterVerificationMem } from '../../../lib/memdb'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    
    if (error) {
      console.error('X OAuth error:', error)
      return NextResponse.redirect(`${url.origin}/?x=error&reason=${encodeURIComponent(error)}`)
    }
    
    if (!code || !state) {
      return NextResponse.redirect(`${url.origin}/?x=error&reason=missing_code_or_state`)
    }
    
    const cookieStore = cookies()
    const storedState = cookieStore.get('x_state')?.value
    const codeVerifier = cookieStore.get('x_code_verifier')?.value
    const walletAddress = cookieStore.get('x_wallet_address')?.value
    
    if (!storedState || !codeVerifier || !walletAddress) {
      return NextResponse.redirect(`${url.origin}/?x=error&reason=missing_session_data`)
    }
    
    if (state !== storedState) {
      return NextResponse.redirect(`${url.origin}/?x=error&reason=invalid_state`)
    }
    
    const { clientId, redirectUri, appHandle, requiredPhrase } = getXConfig()
    
    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken({
      clientId,
      code,
      codeVerifier,
      redirectUri
    })
    
    const tokens = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + (Number(tokenResponse.expires_in || 0) * 1000)
    }
    
    // Get user info
    const me = await getCurrentUser(tokens.accessToken)
    const userId = me.data.id
    const handle = me.data.username
    
    // Check if user follows the app account and has tweeted the required phrase
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
    
    // Store tokens and verification data
    saveTwitterTokens(walletAddress, tokens)
    upsertTwitterVerificationMem({
      walletId: walletAddress,
      twitterUserId: userId,
      handle,
      followedJoinFroggys: followed,
      ribbitTweeted: !!tweetId,
      ribbitTweetId: tweetId || undefined,
      points,
      verifiedAt: Date.now()
    })
    
    // Save to database (non-fatal if it fails)
    try {
      await saveTwitterTokensDB({
        walletId: walletAddress,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : undefined
      })
      
      await addTwitterVerificationDB({
        walletId: walletAddress,
        twitterUserId: userId,
        handle,
        followedJoinFroggys: followed,
        ribbitTweeted: !!tweetId,
        ribbitTweetId: tweetId || undefined,
        points,
        verifiedAt: new Date()
      })
    } catch (e: any) {
      console.error('Database save error (non-fatal):', e)
    }
    
    // Clear temporary cookies
    cookieStore.delete('x_state')
    cookieStore.delete('x_code_verifier')
    cookieStore.delete('x_wallet_address')
    
    // Set a cookie with the token info for the frontend to use
    const tokenCookie = encodeURIComponent(JSON.stringify({
      walletId: walletAddress,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt
    }))
    
    cookieStore.set('xtok', tokenCookie, {
      httpOnly: false, // Frontend needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 // 24 hours
    })
    
    // Redirect back to the main page with success indicator and wallet address
    return NextResponse.redirect(`${url.origin}/?x=ok&address=${encodeURIComponent(walletAddress)}`)
  } catch (e: any) {
    console.error('X callback error:', e)
    const url = new URL(req.url)
    return NextResponse.redirect(`${url.origin}/?x=error&reason=${encodeURIComponent(e?.message || 'callback_failed')}`)
  }
}
