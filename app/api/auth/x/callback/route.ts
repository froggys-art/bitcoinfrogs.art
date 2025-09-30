import { NextResponse } from 'next/server'
import { exchangeCodeForTokens, getCurrentUser } from '../../../../lib/x'
import { saveTwitterTokensDB, upsertWalletDB } from '../../../../db/client'
import { oauthStates } from '../start/route'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    
    if (error) {
      return NextResponse.json({ error: `OAuth error: ${error}` }, { status: 400 })
    }
    
    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
    }
    
    // Retrieve stored state
    const storedState = oauthStates.get(state)
    if (!storedState) {
      return NextResponse.json({ error: 'Invalid or expired state' }, { status: 400 })
    }
    
    // Clean up used state
    oauthStates.delete(state)
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, storedState.codeVerifier)
    
    // Get user info
    const user = await getCurrentUser(tokens.access_token)
    
    // Save to database
    await upsertWalletDB(storedState.walletAddress, 'unisat')
    
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000))
    await saveTwitterTokensDB({
      walletId: storedState.walletAddress,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt
    })
    
    // Return success with user info
    return NextResponse.json({
      success: true,
      user: {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name
      },
      walletAddress: storedState.walletAddress
    })
    
  } catch (error: any) {
    console.error('OAuth callback error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
