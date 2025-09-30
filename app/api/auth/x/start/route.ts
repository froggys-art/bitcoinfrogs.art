import { NextResponse } from 'next/server'
import { buildAuthUrl, generateCodeVerifier, generateCodeChallenge, generateState } from '../../../../lib/x'

// In-memory store for OAuth state (use Redis in production)
const oauthStates = new Map<string, {
  codeVerifier: string
  walletAddress: string
  createdAt: number
}>()

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json()
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
    }
    
    // Generate PKCE parameters
    const state = generateState()
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    
    // Store state temporarily (5 minutes)
    oauthStates.set(state, {
      codeVerifier,
      walletAddress,
      createdAt: Date.now()
    })
    
    // Clean up old states
    for (const [key, value] of oauthStates.entries()) {
      if (Date.now() - value.createdAt > 5 * 60 * 1000) {
        oauthStates.delete(key)
      }
    }
    
    const authUrl = buildAuthUrl(state, codeChallenge)
    
    return NextResponse.json({ authUrl })
    
  } catch (error: any) {
    console.error('OAuth start error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Export the state store for callback to access
export { oauthStates }
