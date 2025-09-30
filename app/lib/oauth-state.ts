// OAuth state management (use Redis in production)
export const oauthStates = new Map<string, {
  codeVerifier: string
  walletAddress: string
  createdAt: number
}>()

// Clean up old states
export function cleanupOldStates() {
  for (const [key, value] of oauthStates.entries()) {
    if (Date.now() - value.createdAt > 5 * 60 * 1000) {
      oauthStates.delete(key)
    }
  }
}
