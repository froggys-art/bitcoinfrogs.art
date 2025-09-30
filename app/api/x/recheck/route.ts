import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const url = new URL(request.url)
    
    // Forward to new verify endpoint
    const verifyResponse = await fetch(`${url.origin}/api/verify/x`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: body.address })
    })
    
    const result = await verifyResponse.json()
    
    if (!verifyResponse.ok) {
      return NextResponse.json(result, { status: verifyResponse.status })
    }
    
    // Transform response to match old format
    return NextResponse.json({
      ok: true,
      handle: result.verification.username,
      followedJoinFroggys: result.verification.isFollowing,
      ribbitTweeted: result.verification.hasTweeted,
      ribbitTweetId: result.verification.tweetId,
      points: result.verification.points
    })
    
  } catch (error: any) {
    console.error('X recheck redirect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
