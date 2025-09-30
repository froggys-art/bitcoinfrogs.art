# Leaderboard Fix Documentation

## Problem
The leaderboard was returning empty results despite having Twitter verification data in the database.

## Root Cause
The system has two separate data flows:
1. **Wallet-based Twitter verification** → `twitter_verifications` table (working)
2. **Social-Fi leaderboard** → `users` + `leaderboard` tables (was empty)

The leaderboard API was querying the Social-Fi tables, but Twitter verification data wasn't being synced to those tables.

## Solution
1. **Added sync function** (`syncTwitterVerificationsToSocialFi`) to migrate data from `twitter_verifications` to `users` and `leaderboard` tables
2. **Created manual trigger endpoint** at `/api/sync/twitter-to-leaderboard`
3. **Successfully synced existing data** - processed 2 Twitter verifications

## Production Deployment Steps

After deploying the latest code, run this command to sync existing Twitter verification data:

```bash
curl -X POST "https://www.bitcoinfrogs.art/api/sync/twitter-to-leaderboard?secret=makefrogsgreatagain"
```

This will:
- Migrate all existing Twitter verification data to the Social-Fi leaderboard tables
- Make the leaderboard immediately show verified users and their points
- Only needs to be run once after deployment

## Verification
Check that the leaderboard is working:
```bash
curl "https://www.bitcoinfrogs.art/api/leaderboard"
```

Should return JSON with user handles and points instead of empty `{"rows": []}`.

## Ongoing Operation
- New Twitter verifications will automatically sync to both systems
- The periodic scan (`/api/scan/12h`) will continue to award points for RIBBIT tweets
- No manual intervention needed after the initial sync
