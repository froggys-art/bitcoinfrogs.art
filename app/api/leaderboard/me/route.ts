import { NextResponse } from 'next/server'
import { getLeaderboardMeDB, getUserIdByHandleDB, getUserIdsByWalletDB } from '../../../db/client'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const handle = (url.searchParams.get('handle') || '').replace(/^@/, '')
    const address = url.searchParams.get('address') || ''

    let userId: string | null = null
    if (handle) {
      userId = await getUserIdByHandleDB(handle)
    } else if (address) {
      const ids = await getUserIdsByWalletDB(address)
      userId = ids[0] || null
    }
    if (!userId) return NextResponse.json({ error: 'handle_or_address_required' }, { status: 400 })

    const me = await getLeaderboardMeDB(userId)
    if (!me) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    return NextResponse.json({ handle: me.handle, points: me.points, rank: me.rank, lastScanAt: me.lastScanAt })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
