import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // This is a temporary redirect to handle the old callback URL
  // The X app configuration should be updated to use /api/x/callback instead
  const url = new URL(req.url)
  const newUrl = url.toString().replace('/api/twitter/callback', '/api/x/callback')
  
  console.log('Redirecting from old Twitter callback to new X callback:', newUrl)
  
  return NextResponse.redirect(newUrl)
}
