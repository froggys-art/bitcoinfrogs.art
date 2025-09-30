import { randomBytes, createHash } from 'node:crypto'

export function getXConfig() {
  const clientId = process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || ''
  const clientSecret = process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || ''
  const redirectUri = process.env.X_REDIRECT_URI || process.env.TWITTER_REDIRECT_URI || ''
  const appHandle = process.env.X_APP_HANDLE || process.env.FROGGYS_TWITTER_HANDLE || 'joinfroggys'
  const requiredPhrase = process.env.X_REQUIRED_TWEET_PHRASE || process.env.TWITTER_REQUIRED_TWEET_PHRASE || 'RIBBIT'
  if (!clientId || !redirectUri) {
    throw new Error('Missing X_CLIENT_ID or X_REDIRECT_URI')
  }
  return { clientId, clientSecret, redirectUri, appHandle, requiredPhrase }
}

// Back-compat export to avoid refactors in existing imports
export const getTwitterConfig = getXConfig

const API_BASE = (process.env.X_API_BASE || 'https://api.x.com').replace(/\/$/, '')

function getBearerToken() {
  return process.env.TWITTER_BEARER_TOKEN || process.env.X_BEARER_TOKEN || ''
}

export async function refreshAccessToken(opts: { clientId: string; refreshToken: string }) {
  const body = new URLSearchParams()
  body.set('client_id', opts.clientId)
  body.set('grant_type', 'refresh_token')
  body.set('refresh_token', opts.refreshToken)

  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  const secret = process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || ''
  if (secret) {
    const basic = Buffer.from(`${opts.clientId}:${secret}`).toString('base64')
    headers.Authorization = `Basic ${basic}`
  }
  const res = await fetch(`${API_BASE}/2/oauth2/token`, {
    method: 'POST',
    headers,
    body,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`token_refresh_failed: ${res.status} ${t}`)
  }
  return (await res.json()) as {
    access_token: string
    token_type: string
    expires_in: number
    scope: string
    refresh_token?: string
  }
}

export function genRandomUrlSafe(size = 32) {
  return randomBytes(size).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function sha256Base64Url(input: string) {
  const hash = createHash('sha256').update(input).digest('base64')
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function buildAuthUrl(state: string, codeChallenge: string, clientId: string, redirectUri: string) {
  // Use x.com for user-facing authorization page
  const base = 'https://x.com/i/oauth2/authorize'
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read users.read follows.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${base}?${params.toString()}`
}

export async function exchangeCodeForToken(opts: {
  clientId: string
  code: string
  codeVerifier: string
  redirectUri: string
}) {
  const body = new URLSearchParams()
  body.set('client_id', opts.clientId)
  body.set('grant_type', 'authorization_code')
  body.set('code', opts.code)
  body.set('redirect_uri', opts.redirectUri)
  body.set('code_verifier', opts.codeVerifier)

  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  const secret = process.env.X_CLIENT_SECRET || process.env.X_API_SECRET || process.env.TWITTER_CLIENT_SECRET || ''
  if (secret) {
    const basic = Buffer.from(`${opts.clientId}:${secret}`).toString('base64')
    headers.Authorization = `Basic ${basic}`
  }
  const res = await fetch(`${API_BASE}/2/oauth2/token`, {
    method: 'POST',
    headers,
    body,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`token_exchange_failed: ${res.status} ${t}`)
  }
  return (await res.json()) as {
    access_token: string
    token_type: string
    expires_in: number
    scope: string
    refresh_token?: string
  }
}

export async function getCurrentUser(accessToken: string) {
  const res = await fetch(`${API_BASE}/2/users/me?user.fields=username,name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    let body: string
    try { body = await res.text() } catch { body = '' }
    throw new Error(`get_current_user_failed: ${res.status} ${body}`)
  }
  return (await res.json()) as { data: { id: string; username: string; name: string } }
}

export async function getUserByUsername(accessToken: string, username: string) {
  const res = await fetch(`${API_BASE}/2/users/by/username/${encodeURIComponent(username)}?user.fields=username`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('get_user_by_username_failed')
  return (await res.json()) as { data: { id: string; username: string } }
}

export async function isFollowing(accessToken: string, sourceUserId: string, targetUserId: string, maxPages = 5) {
  // Paginate following list up to maxPages
  let nextToken: string | undefined = undefined
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`${API_BASE}/2/users/${sourceUserId}/following`)
    url.searchParams.set('max_results', '1000')
    url.searchParams.set('user.fields', 'username')
    if (nextToken) url.searchParams.set('pagination_token', nextToken)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) {
      let body: string
      try { body = await res.text() } catch { body = '' }
      throw new Error(`get_following_failed: ${res.status} ${body}`)
    }
    const j = (await res.json()) as { data?: Array<{ id: string; username: string }>; meta?: { next_token?: string } }
    if (j.data?.some((u) => u.id === targetUserId)) return true
    nextToken = j.meta?.next_token
    if (!nextToken) break
  }
  return false
}

export async function findRecentTweetContaining(accessToken: string, userId: string, term: string, maxPages = 2) {
  let nextToken: string | undefined = undefined
  const t = term.toLowerCase()
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`${API_BASE}/2/users/${userId}/tweets`)
    url.searchParams.set('max_results', '100')
    url.searchParams.set('tweet.fields', 'created_at')
    if (nextToken) url.searchParams.set('pagination_token', nextToken)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) {
      let body: string
      try { body = await res.text() } catch { body = '' }
      throw new Error(`get_user_tweets_failed: ${res.status} ${body}`)
    }
    const j = (await res.json()) as { data?: Array<{ id: string; text: string }>; meta?: { next_token?: string } }
    const found = j.data?.find((tw) => (tw.text || '').toLowerCase().includes(t))
    if (found) return found.id
    nextToken = j.meta?.next_token
    if (!nextToken) break
  }
  return null
}

// ---------------- App-only (Bearer) helpers ----------------
export async function appGetUserByUsername(username: string) {
  const bearer = getBearerToken()
  if (!bearer) throw new Error('Missing TWITTER_BEARER_TOKEN')
  const res = await fetch(`${API_BASE}/2/users/by/username/${encodeURIComponent(username)}?user.fields=username`, {
    headers: { Authorization: `Bearer ${bearer}` },
  })
  if (!res.ok) throw new Error('app_get_user_by_username_failed')
  return (await res.json()) as { data: { id: string; username: string } }
}

type SearchOpts = { start_time?: string; max_results?: number }
export async function appSearchTweets(query: string, opts: SearchOpts = {}) {
  const bearer = getBearerToken()
  if (!bearer) throw new Error('Missing TWITTER_BEARER_TOKEN')
  const url = new URL(`${API_BASE}/2/tweets/search/recent`)
  url.searchParams.set('query', query)
  url.searchParams.set('tweet.fields', 'author_id,created_at,conversation_id,entities,referenced_tweets')
  if (opts.start_time) url.searchParams.set('start_time', opts.start_time)
  if (opts.max_results) url.searchParams.set('max_results', String(opts.max_results))
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${bearer}` } })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`app_search_failed: ${res.status} ${t}`)
  }
  return (await res.json()) as { data?: Array<{ id: string; text: string; created_at: string; conversation_id?: string }>; meta?: any }
}

export async function findRibbitTweetApp(handle: string, since?: Date) {
  const q = `from:${handle} (ribbit OR RIBBIT OR Ribbit) -is:retweet`
  const res = await appSearchTweets(q, { start_time: since ? since.toISOString() : undefined, max_results: 10 })
  return res.data?.[0] || null
}

export async function findRibbitTaggedTweetApp(handle: string, target: string, since?: Date) {
  const q = `from:${handle} (@${target}) (ribbit OR RIBBIT OR Ribbit) -is:retweet`
  const res = await appSearchTweets(q, { start_time: since ? since.toISOString() : undefined, max_results: 10 })
  return res.data?.[0] || null
}

export async function repliedRibbitToTargetTweetApp(handle: string, targetTweetId: string) {
  const q = `conversation_id:${targetTweetId} from:${handle} (ribbit OR RIBBIT OR Ribbit)`
  const res = await appSearchTweets(q, { max_results: 10 })
  return res.data?.[0] ? { tweet_id: res.data[0].id } : null
}
