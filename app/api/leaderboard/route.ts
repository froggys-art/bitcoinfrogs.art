import { NextResponse } from 'next/server'
import { getLeaderboardPageDB } from '../../db/client'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1), 200)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0)

    const { rows, nextOffset } = await getLeaderboardPageDB(limit, offset)
    // rank on read
    const resp = rows.map((r: { handle: string; points: number }, idx: number) => ({ rank: offset + idx + 1, handle: r.handle, points: r.points }))
    return NextResponse.json({ rows: resp, nextOffset })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
