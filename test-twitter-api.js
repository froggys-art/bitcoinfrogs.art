// Simple Node.js test for Twitter API
const BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAANm94QEAAAAAGpI8ATNyYMl89I1/BvWb4lpavgE=FBmYNj7qMAMtnV8dEoyN13w4fY0XFploxAWKWBj5w8oSPd6TML";

async function test() {
  console.log("Testing Twitter API with Bearer Token...\n");

  // Test 1: Get user by username
  console.log("1. Testing getUserByUsername (joinfroggys)...");
  try {
    const res = await fetch("https://api.x.com/2/users/by/username/joinfroggys?user.fields=username", {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
    });
    const data = await res.json();
    if (res.ok) {
      console.log("✓ Success:", JSON.stringify(data, null, 2));
    } else {
      console.log("✗ Failed:", res.status, JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log("✗ Error:", e.message);
  }

  // Test 2: Search tweets
  console.log("\n2. Testing tweet search...");
  try {
    const query = encodeURIComponent("from:BitcoinFroggys RIBBIT -is:retweet");
    const url = `https://api.x.com/2/tweets/search/recent?query=${query}&max_results=10`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
    });
    const data = await res.json();
    if (res.ok) {
      console.log("✓ Success:", JSON.stringify(data, null, 2));
    } else {
      console.log("✗ Failed:", res.status, JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log("✗ Error:", e.message);
  }

  // Test 3: Check following (this is the one that likely fails)
  console.log("\n3. Testing get following list...");
  try {
    // Using a test user ID - replace with actual if needed
    const userId = "1234567890"; // placeholder
    const url = `https://api.x.com/2/users/${userId}/following?max_results=10`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
    });
    const data = await res.json();
    if (res.ok) {
      console.log("✓ Success:", JSON.stringify(data, null, 2));
    } else {
      console.log("✗ Failed:", res.status, JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log("✗ Error:", e.message);
  }
}

test();
