import { NextResponse } from 'next/server'
import { getLatestTwitterVerificationDB, getTwitterTokensDB } from '../../../db/client'
import { getLatestTwitterVerificationMem, getTwitterTokens } from '../../../lib/memdb'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const address = url.searchParams.get('address')
    
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'address parameter required' }, { status: 400 })
    }
    
    // Try to get verification data from memory first (fastest)
    let verification = getLatestTwitterVerificationMem(address)
    
    // If not in memory, try database
    if (!verification) {
      try {
        const dbVerification = await getLatestTwitterVerificationDB(address)
        if (dbVerification) {
          verification = {
            id: `${dbVerification.walletId}:${Date.now()}`,
            walletId: dbVerification.walletId as string,
            twitterUserId: dbVerification.twitterUserId as string,
            handle: dbVerification.handle as string,
            followedJoinFroggys: !!dbVerification.followedJoinFroggys,
            ribbitTweeted: !!dbVerification.ribbitTweeted,
            ribbitTweetId: dbVerification.ribbitTweetId as string | undefined,
            points: Number(dbVerification.points || 0),
            verifiedAt: dbVerification.verifiedAt ? new Date(dbVerification.verifiedAt as any).getTime() : Date.now(),
            createdAt: dbVerification.verifiedAt ? new Date(dbVerification.verifiedAt as any).getTime() : Date.now()
          }
        }
      } catch (e: any) {
        console.error('Database lookup error (non-fatal):', e)
      }
    }
    
    // Check if we have valid tokens (indicates connection)
    let hasValidTokens = false
    const tokens = getTwitterTokens(address)
    if (tokens?.accessToken) {
      hasValidTokens = true
    } else {
      // Check database for tokens
      try {
        const dbTokens = await getTwitterTokensDB(address)
        if (dbTokens?.accessToken) {
          hasValidTokens = true
        }
      } catch (e: any) {
        console.error('Token lookup error (non-fatal):', e)
      }
    }
    
    // Also check for cookie-based tokens (from recent auth)
    if (!hasValidTokens) {
      try {
        const cookieStore = cookies()
        const xtok = cookieStore.get('xtok')?.value
        if (xtok) {
          const parsed = JSON.parse(decodeURIComponent(xtok)) as {
            walletId: string
            accessToken: string
            refreshToken?: string
            expiresAt?: number
          }
          if (parsed?.walletId === address && parsed.accessToken) {
            hasValidTokens = true
          }
        }
      } catch (e: any) {
        console.error('Cookie token check error (non-fatal):', e)
      }
    }
    
    if (!verification || !hasValidTokens) {
      return NextResponse.json({ 
        connected: false,
        error: 'not_connected'
      })
    }
    
    return NextResponse.json({
      connected: true,
      handle: verification.handle,
      followedJoinFroggys: verification.followedJoinFroggys,
      ribbitTweeted: verification.ribbitTweeted,
      ribbitTweetId: verification.ribbitTweetId,
      points: verification.points,
      verifiedAt: verification.verifiedAt
    })
  } catch (e: any) {
    console.error('X status error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to get X status' }, { status: 500 })
  }
}
