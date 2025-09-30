import { NextResponse } from 'next/server'
import { getXConfig, genRandomUrlSafe, sha256Base64Url, buildAuthUrl } from '../../../lib/twitter'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const address = url.searchParams.get('address')
    
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'address parameter required' }, { status: 400 })
    }

    const { clientId, redirectUri } = getXConfig()
    
    // Generate PKCE parameters
    const codeVerifier = genRandomUrlSafe(128)
    const codeChallenge = sha256Base64Url(codeVerifier)
    const state = genRandomUrlSafe(32)
    
    // Store PKCE parameters and wallet address in cookies for the callback
    const cookieStore = cookies()
    cookieStore.set('x_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })
    cookieStore.set('x_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })
    cookieStore.set('x_wallet_address', address, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })
    
    // Build the X authorization URL
    const authUrl = buildAuthUrl(state, codeChallenge, clientId, redirectUri)
    
    // Redirect to X for authorization
    return NextResponse.redirect(authUrl)
  } catch (e: any) {
    console.error('X start error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to start X authorization' }, { status: 500 })
  }
}
