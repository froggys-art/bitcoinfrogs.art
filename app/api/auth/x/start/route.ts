import { NextResponse } from 'next/server'
import { buildAuthUrl, generateCodeVerifier, generateCodeChallenge, generateState } from '../../../../lib/x'
import { oauthStates, cleanupOldStates } from '../../../../lib/oauth-state'

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
    cleanupOldStates()
    
    const authUrl = buildAuthUrl(state, codeChallenge)
    
    return NextResponse.json({ authUrl })
    
  } catch (error: any) {
    console.error('OAuth start error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
