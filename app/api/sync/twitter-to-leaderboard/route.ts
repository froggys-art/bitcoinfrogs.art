import { NextResponse } from 'next/server'
import { syncTwitterVerificationsToSocialFi } from '../../../db/client'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const secret = process.env.CRON_SECRET || ''
    const url = new URL(req.url)
    const auth = url.searchParams.get('secret') || req.headers.get('x-cron-secret') || ''
    
    if (!secret || auth !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    console.log('Starting Twitter verification sync to Social-Fi tables...')
    const result = await syncTwitterVerificationsToSocialFi()
    
    console.log(`Sync completed: ${result.synced} synced, ${result.errors} errors`)
    
    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      message: `Successfully synced ${result.synced} Twitter verifications to leaderboard`
    })
  } catch (e: any) {
    console.error('Sync endpoint error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
