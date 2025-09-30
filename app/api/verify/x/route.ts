import { NextResponse } from 'next/server'
import { getCurrentUser, getUserByUsername, isUserFollowing, findRecentTweetWithPhrase, getXConfig } from '../../../lib/x'
import { 
  getTwitterTokensDB, 
  addTwitterVerificationDB, 
  upsertUserDB, 
  ensureLeaderboardRowDB, 
  awardPointsDB,
  hasScoreEventDB 
} from '../../../db/client'

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json()
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
    }
    
    // Get stored tokens
    const tokens = await getTwitterTokensDB(walletAddress)
    if (!tokens?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated. Please connect X account first.' }, { status: 401 })
    }
    
    const { targetHandle, requiredPhrase } = getXConfig()
    
    // Get current user
    const currentUser = await getCurrentUser(tokens.accessToken)
    const userId = currentUser.data.id
    const username = currentUser.data.username
    
    // Get target user to follow
    const targetUser = await getUserByUsername(tokens.accessToken, targetHandle)
    const targetUserId = targetUser.data.id
    
    // Check if user follows target
    const isFollowing = await isUserFollowing(tokens.accessToken, userId, targetUserId)
    
    // Check if user tweeted required phrase
    const tweetId = await findRecentTweetWithPhrase(tokens.accessToken, userId, requiredPhrase)
    const hasTweeted = !!tweetId
    
    // Calculate points
    const followPoints = isFollowing ? 10 : 0
    const tweetPoints = hasTweeted ? 10 : 0
    const totalPoints = followPoints + tweetPoints
    
    // Save verification record
    await addTwitterVerificationDB({
      walletId: walletAddress,
      twitterUserId: userId,
      handle: username,
      followedJoinFroggys: isFollowing,
      ribbitTweeted: hasTweeted,
      ribbitTweetId: tweetId || undefined,
      points: totalPoints,
      verifiedAt: new Date()
    })
    
    // Update leaderboard
    await upsertUserDB({
      twitterUserId: userId,
      twitterHandle: username,
      walletId: walletAddress
    })
    
    await ensureLeaderboardRowDB(userId)
    
    // Award points (only once per achievement)
    if (isFollowing && !(await hasScoreEventDB(userId, 'follow_ok'))) {
      await awardPointsDB(userId, 'follow_ok', followPoints)
    }
    
    if (hasTweeted && tweetId && !(await hasScoreEventDB(userId, 'ribbit'))) {
      await awardPointsDB(userId, 'ribbit', tweetPoints, { tweetId })
    }
    
    return NextResponse.json({
      success: true,
      verification: {
        username,
        isFollowing,
        hasTweeted,
        tweetId,
        points: totalPoints
      },
      requirements: {
        mustFollow: targetHandle,
        mustTweet: requiredPhrase
      }
    })
    
  } catch (error: any) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
