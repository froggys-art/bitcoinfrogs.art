import { NextResponse } from 'next/server'
import { getLatestTwitterVerificationDB, getTwitterTokensDB, getUserIdsByWalletDB, getLeaderboardMeDB } from '../../../../db/client'

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address
    
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }
    
    // Check if user has connected X account
    const tokens = await getTwitterTokensDB(address)
    const hasConnectedX = !!tokens?.accessToken
    
    // Get latest verification
    const verification = await getLatestTwitterVerificationDB(address)
    
    // Get leaderboard position if user exists
    let leaderboardData = null
    if (verification?.twitterUserId) {
      leaderboardData = await getLeaderboardMeDB(verification.twitterUserId)
    }
    
    return NextResponse.json({
      address,
      hasConnectedX,
      verification: verification ? {
        username: verification.handle,
        isFollowing: verification.followedJoinFroggys,
        hasTweeted: verification.ribbitTweeted,
        tweetId: verification.ribbitTweetId,
        points: verification.points,
        verifiedAt: verification.verifiedAt
      } : null,
      leaderboard: leaderboardData ? {
        rank: leaderboardData.rank,
        points: leaderboardData.points,
        handle: leaderboardData.handle
      } : null
    })
    
  } catch (error: any) {
    console.error('Get user status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
