import { NextResponse } from 'next/server'
import { addVerification, claimFrogsForWalletMem, logEvent, upsertWallet } from '../../../lib/memdb'
import { addVerificationDB, claimFrogsForWalletDB, logEventDB, upsertWalletDB, markUsersVerifiedByWalletDB } from '../../../db/client'

export async function POST(req: Request) {
  try {
    const { address, provider, numbers, reservedText } = await req.json()
    if (!address || typeof address !== 'string') return NextResponse.json({ error: 'address required' }, { status: 400 })
    const prov = (provider || 'unisat') as 'unisat' | 'okx' | 'xverse'
    const nums: number[] = Array.isArray(numbers) ? numbers.filter((n: any) => Number.isFinite(n)) : []

    // Double-claim prevention: claim frog numbers for wallet
    const dbResult = await claimFrogsForWalletDB(address, nums)
    const memResult = claimFrogsForWalletMem(address, nums)
    const conflicts = Array.from(new Set([...(dbResult?.conflicts || []), ...(memResult?.conflicts || [])])).sort((a,b)=>a-b)
    if (conflicts.length) {
      return NextResponse.json({ error: 'already_claimed', conflicts }, { status: 409 })
    }

    upsertWallet(address, prov)
    await upsertWalletDB(address, prov)
    const v = addVerification({
      walletId: address,
      status: 'verified',
      holdCount: nums.length,
      frogNumbers: nums,
      reservedText,
      verifiedAt: Date.now(),
    })
    logEvent('verify_confirm', { address, provider: prov, numbers: nums, reservedText, verificationId: v.id })
    await logEventDB('verify_confirm', { address, provider: prov, numbers: nums, reservedText, verificationId: v.id }, address)
    const id = await addVerificationDB({
      walletId: address,
      status: 'verified',
      holdCount: nums.length,
      frogNumbers: nums,
      reservedText,
      verifiedAt: new Date(),
    })
    try {
      await markUsersVerifiedByWalletDB(address)
    } catch {}
    return NextResponse.json({ ok: true, verificationId: id || v.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
