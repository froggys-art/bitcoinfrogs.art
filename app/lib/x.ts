import { randomBytes, createHash } from 'crypto'

// Environment configuration
export function getXConfig() {
  const clientId = process.env.X_CLIENT_ID || ''
  const clientSecret = process.env.X_CLIENT_SECRET || ''
  const redirectUri = process.env.X_REDIRECT_URI || 'http://localhost:3000/api/auth/x/callback'
  const targetHandle = process.env.X_TARGET_HANDLE || 'joinfroggys'
  const requiredPhrase = process.env.X_REQUIRED_PHRASE || 'RIBBIT'
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing X_CLIENT_ID or X_CLIENT_SECRET')
  }
  
  return { clientId, clientSecret, redirectUri, targetHandle, requiredPhrase }
}

// Crypto utilities for PKCE
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function generateState(): string {
  return randomBytes(16).toString('base64url')
}

// Build X OAuth URL
export function buildAuthUrl(state: string, codeChallenge: string): string {
  const { clientId, redirectUri } = getXConfig()
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read users.read follows.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`
}

// Exchange code for tokens
export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const { clientId, clientSecret, redirectUri } = getXConfig()
  
  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${response.status} ${error}`)
  }
  
  return await response.json() as {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
    scope: string
  }
}

// Get current user
export async function getCurrentUser(accessToken: string) {
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=username,name', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Get user failed: ${response.status} ${error}`)
  }
  
  return await response.json() as {
    data: {
      id: string
      username: string
      name: string
    }
  }
}

// Get user by username
export async function getUserByUsername(accessToken: string, username: string) {
  const response = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Get user by username failed: ${response.status} ${error}`)
  }
  
  return await response.json() as {
    data: {
      id: string
      username: string
    }
  }
}

// Check if user follows target
export async function isUserFollowing(accessToken: string, userId: string, targetUserId: string): Promise<boolean> {
  let nextToken: string | undefined
  
  // Paginate through following list
  for (let page = 0; page < 5; page++) {
    const url = new URL(`https://api.twitter.com/2/users/${userId}/following`)
    url.searchParams.set('max_results', '1000')
    if (nextToken) url.searchParams.set('pagination_token', nextToken)
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Check following failed: ${response.status} ${error}`)
    }
    
    const data = await response.json() as {
      data?: Array<{ id: string }>
      meta?: { next_token?: string }
    }
    
    if (data.data?.some(user => user.id === targetUserId)) {
      return true
    }
    
    nextToken = data.meta?.next_token
    if (!nextToken) break
  }
  
  return false
}

// Find recent tweet containing phrase
export async function findRecentTweetWithPhrase(accessToken: string, userId: string, phrase: string): Promise<string | null> {
  let nextToken: string | undefined
  
  // Check recent tweets
  for (let page = 0; page < 3; page++) {
    const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`)
    url.searchParams.set('max_results', '100')
    url.searchParams.set('tweet.fields', 'created_at')
    if (nextToken) url.searchParams.set('pagination_token', nextToken)
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Get tweets failed: ${response.status} ${error}`)
    }
    
    const data = await response.json() as {
      data?: Array<{ id: string; text: string }>
      meta?: { next_token?: string }
    }
    
    const matchingTweet = data.data?.find(tweet => 
      tweet.text.toLowerCase().includes(phrase.toLowerCase())
    )
    
    if (matchingTweet) {
      return matchingTweet.id
    }
    
    nextToken = data.meta?.next_token
    if (!nextToken) break
  }
  
  return null
}

// Bearer token functions for scanning (app-only auth)
function getBearerToken(): string {
  return process.env.TWITTER_BEARER_TOKEN || process.env.X_BEARER_TOKEN || ''
}

// App-only: Search for tweets
async function searchTweets(query: string, options: { start_time?: string; max_results?: number } = {}) {
  const bearer = getBearerToken()
  if (!bearer) throw new Error('Missing TWITTER_BEARER_TOKEN')
  
  const url = new URL('https://api.twitter.com/2/tweets/search/recent')
  url.searchParams.set('query', query)
  url.searchParams.set('tweet.fields', 'author_id,created_at,conversation_id')
  if (options.start_time) url.searchParams.set('start_time', options.start_time)
  if (options.max_results) url.searchParams.set('max_results', String(options.max_results))
  
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${bearer}` }
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Search tweets failed: ${response.status} ${error}`)
  }
  
  return await response.json() as {
    data?: Array<{ id: string; text: string; created_at: string; conversation_id?: string }>
    meta?: any
  }
}

// Find RIBBIT tweet from user
export async function findRibbitTweetApp(handle: string, since?: Date) {
  const query = `from:${handle} (ribbit OR RIBBIT OR Ribbit) -is:retweet`
  const result = await searchTweets(query, {
    start_time: since ? since.toISOString() : undefined,
    max_results: 10
  })
  return result.data?.[0] || null
}

// Find RIBBIT tweet mentioning target
export async function findRibbitTaggedTweetApp(handle: string, target: string, since?: Date) {
  const query = `from:${handle} (@${target}) (ribbit OR RIBBIT OR Ribbit) -is:retweet`
  const result = await searchTweets(query, {
    start_time: since ? since.toISOString() : undefined,
    max_results: 10
  })
  return result.data?.[0] || null
}
