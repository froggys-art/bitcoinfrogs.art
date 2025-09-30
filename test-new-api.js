// Test script for new X Social-Fi API
const BASE_URL = 'http://localhost:3000'
const TEST_WALLET = 'bc1patnxh9uml24j50epra75a40g39kh59p97ywmg35zdpj3r6rwwf5qsq030v'

async function testAPI() {
  console.log('🧪 Testing New X Social-Fi API\n')
  
  try {
    // Test 1: Start OAuth flow
    console.log('1️⃣ Testing OAuth start...')
    const startResponse = await fetch(`${BASE_URL}/api/auth/x/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: TEST_WALLET })
    })
    const startData = await startResponse.json()
    
    if (startResponse.ok) {
      console.log('✅ OAuth start successful')
      console.log('🔗 Auth URL:', startData.authUrl)
    } else {
      console.log('❌ OAuth start failed:', startData.error)
    }
    
    // Test 2: Get user status
    console.log('\n2️⃣ Testing user status...')
    const statusResponse = await fetch(`${BASE_URL}/api/user/${TEST_WALLET}/status`)
    const statusData = await statusResponse.json()
    
    if (statusResponse.ok) {
      console.log('✅ User status retrieved')
      console.log('📊 Status:', JSON.stringify(statusData, null, 2))
    } else {
      console.log('❌ User status failed:', statusData.error)
    }
    
    // Test 3: Get leaderboard
    console.log('\n3️⃣ Testing leaderboard...')
    const leaderboardResponse = await fetch(`${BASE_URL}/api/leaderboard?limit=5`)
    const leaderboardData = await leaderboardResponse.json()
    
    if (leaderboardResponse.ok) {
      console.log('✅ Leaderboard retrieved')
      console.log('🏆 Top 5:', JSON.stringify(leaderboardData, null, 2))
    } else {
      console.log('❌ Leaderboard failed:', leaderboardData.error)
    }
    
    console.log('\n🎉 API tests completed!')
    console.log('\n📝 Next steps:')
    console.log('1. Update your .env with X credentials')
    console.log('2. Visit the auth URL to complete OAuth')
    console.log('3. Test verification endpoint after auth')
    
  } catch (error) {
    console.error('💥 Test error:', error.message)
  }
}

testAPI()
