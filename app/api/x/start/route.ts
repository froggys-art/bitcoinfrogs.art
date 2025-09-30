import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const address = url.searchParams.get('address')
    
    if (!address) {
      return NextResponse.json({ error: 'address required' }, { status: 400 })
    }
    
    // Call the new auth endpoint
    const startResponse = await fetch(`${url.origin}/api/auth/x/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address })
    })
    
    if (!startResponse.ok) {
      const error = await startResponse.json()
      return NextResponse.json(error, { status: startResponse.status })
    }
    
    const { authUrl } = await startResponse.json()
    
    // Redirect to X OAuth
    return NextResponse.redirect(authUrl)
    
  } catch (error: any) {
    console.error('X start redirect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
