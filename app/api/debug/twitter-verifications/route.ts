import { NextResponse } from 'next/server'
import { db } from '../../../db/client'
import { twitterVerifications } from '../../../db/schema'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET || ''
    const url = new URL(req.url)
    const auth = url.searchParams.get('secret') || req.headers.get('x-cron-secret') || ''
    
    if (!secret || auth !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: 'database not available' }, { status: 500 })
    }

    const verifications = await db.select().from(twitterVerifications)
    
    return NextResponse.json({
      count: verifications.length,
      verifications: verifications.map((v: any) => ({
        id: v.id,
        walletId: v.walletId,
        twitterUserId: v.twitterUserId,
        handle: v.handle,
        points: v.points,
        followedJoinFroggys: v.followedJoinFroggys,
        ribbitTweeted: v.ribbitTweeted,
        verifiedAt: v.verifiedAt,
        createdAt: v.createdAt
      }))
    })
  } catch (e: any) {
    console.error('Debug endpoint error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
