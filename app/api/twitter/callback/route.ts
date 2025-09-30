import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    
    // Forward to new auth callback
    const callbackUrl = new URL('/api/auth/x/callback', url.origin)
    callbackUrl.search = url.search // Copy all query params
    
    const response = await fetch(callbackUrl.toString())
    
    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }
    
    const result = await response.json()
    
    // Redirect back to home with success
    const redirectUrl = new URL('/', url.origin)
    redirectUrl.searchParams.set('x', 'connected')
    redirectUrl.searchParams.set('address', result.walletAddress)
    
    return NextResponse.redirect(redirectUrl.toString())
    
  } catch (error: any) {
    console.error('Twitter callback redirect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
