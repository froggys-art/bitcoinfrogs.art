"use client"

import { useCallback, useEffect, useState } from 'react'
import { getAddress, signMessage as xverseSignMessage, AddressPurpose, BitcoinNetworkType } from '@sats-connect/core'

type Provider = 'unisat' | 'okx' | 'xverse'

export default function VerifyPanel() {
  function shorten(addr?: string | null, p = 6, s = 6) {
    if (!addr) return ''
    if (addr.length <= p + s + 3) return addr
    return `${addr.slice(0, p)}${addr.slice(-s)}`
  }
  const [provider, setProvider] = useState<Provider | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [installOpen, setInstallOpen] = useState(false)
  const [installOKXOpen, setInstallOKXOpen] = useState(false)
  const [installXverseOpen, setInstallXverseOpen] = useState(false)
  const [hasUniSat, setHasUniSat] = useState(false)
  const [hasOKX, setHasOKX] = useState(false)
  const [hasXverse, setHasXverse] = useState(false)

  const [holdCount, setHoldCount] = useState<number | null>(null)
  const [numbers, setNumbers] = useState<number[]>([])
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [claimConflicts, setClaimConflicts] = useState<number[] | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [twitter, setTwitter] = useState<{
    handle?: string
    followedJoinFroggys: boolean
    ribbitTweeted: boolean
    ribbitTweetId?: string | null
    points: number
    verifiedAt?: number | null
  } | null>(null)

  useEffect(() => {
    const w: any = window as any
    setHasUniSat(!!w.unisat)
    setHasOKX(!!w.okxwallet?.bitcoin)
    setHasXverse(!!(w.xverseProviders?.bitcoin || w.xverse?.bitcoin || w.btc || w.BitcoinProvider))
  }, [])

  const loadHoldings = useCallback(async (addr: string) => {
    try {
      setStatus('Loading Bitcoin Frogs')
      const res = await fetch(`/api/holdings?address=${encodeURIComponent(addr)}`)
      const j = await res.json()
      if (res.ok) {
        setHoldCount(typeof j?.count === 'number' ? j.count : 0)
        setNumbers(Array.isArray(j?.numbers) ? j.numbers : [])
      }
    } finally {
      setStatus((s) => (s === 'Loading Bitcoin Frogs' ? null : s))
    }
  }, [])

  // Restore cached wallet and optional address from URL on mount
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const addrFromUrl = url.searchParams.get('address')
      const addrFromStorage = localStorage.getItem('bf_wallet_address')
      const provFromStorage = localStorage.getItem('bf_wallet_provider') as Provider | null
      const addr = addrFromUrl || addrFromStorage
      if (addr && !address) {
        setAddress(addr)
        if (provFromStorage) setProvider(provFromStorage)
        // Preload holdings and twitter status
        loadHoldings(addr)
        fetchTwitterStatus(addr)
      }
      if (addrFromUrl) {
        url.searchParams.delete('address')
        window.history.replaceState({}, '', url.pathname + (url.search ? `?${url.searchParams.toString()}` : '') + url.hash)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTwitterStatus = useCallback(async (addr: string) => {
    try {
      setStatus('Checking X status')
      const res = await fetch(`/api/x/status?address=${encodeURIComponent(addr)}`, { credentials: 'include' as RequestCredentials })
      const j = await res.json()
      if (res.ok && j?.connected) {
        setTwitter({
          handle: j.handle || undefined,
          followedJoinFroggys: !!j.followedJoinFroggys,
          ribbitTweeted: !!j.ribbitTweeted,
          ribbitTweetId: j.ribbitTweetId || null,
          points: Number(j.points || 0),
          verifiedAt: j.verifiedAt || null,
        })
      }
    } finally {
      setStatus((s) => (s === 'Checking X status' ? null : s))
    }
  }, [])

  useEffect(() => {
    // After redirect back from X
    try {
      const url = new URL(window.location.href)
      const ok = url.searchParams.get('x')
      if (ok === 'ok' && address) {
        fetchTwitterStatus(address)
        url.searchParams.delete('x')
        window.history.replaceState({}, '', url.pathname + (url.search ? `?${url.searchParams.toString()}` : '') + url.hash)
      }
    } catch {}
  }, [address, fetchTwitterStatus])

  // Sats Connect helpers: handle both payload and legacy top-level API shapes
  const scGetAddress = useCallback(async (purposes: any[]) => {
    return await new Promise<any>((resolve, reject) => {
      try {
        getAddress({
          payload: {
            purposes,
            message: 'Connect to Bitcoin Frogs',
            network: { type: (BitcoinNetworkType as any)?.Mainnet || 'Mainnet' },
          },
          onFinish: resolve,
          onCancel: () => reject(new Error('User canceled')),
        } as any)
      } catch (err1) {
        // Fallback to older shape
        try {
          ;(getAddress as any)({
            purposes,
            message: 'Connect to Bitcoin Frogs',
            network: { type: (BitcoinNetworkType as any)?.Mainnet || 'Mainnet' },
            onFinish: resolve,
            onCancel: () => reject(new Error('User canceled')),
          })
        } catch (err2) {
          reject(err2)
        }
      }
    })
  }, [])

  const scSignMessage = useCallback(async (addr: string, message: string) => {
    return await new Promise<any>((resolve, reject) => {
      try {
        xverseSignMessage({
          payload: {
            address: addr,
            message,
            network: { type: (BitcoinNetworkType as any)?.Mainnet || 'Mainnet' },
          },
          onFinish: resolve,
          onCancel: () => reject(new Error('User canceled signing')),
        } as any)
      } catch (err1) {
        try {
          ;(xverseSignMessage as any)({
            address: addr,
            message,
            network: { type: (BitcoinNetworkType as any)?.Mainnet || 'Mainnet' },
            onFinish: resolve,
            onCancel: () => reject(new Error('User canceled signing')),
          })
        } catch (err2) {
          reject(err2)
        }
      }
    })
  }, [])

  const connectUniSat = useCallback(async () => {
    setError(null)
    setLoading(true)
    setProvider('unisat')
    setStatus('Connecting to UniSat')
    try {
      const api = (window as any).unisat as any
      if (!api) {
        // Prompt user to install UniSat
        setInstallOpen(true)
        setLoading(false)
        setProvider(null)
        setStatus(null)
        return
      }
      // Always call requestAccounts first to trigger the extension UI
      try {
        if (api.requestAccounts) await api.requestAccounts()
      } catch (e: any) {
        // Surface error if the user rejected or wallet is locked
        const msg = e?.message || 'Please approve the UniSat connection popup or unlock your wallet.'
        setError(msg)
      }

      // Then fetch accounts; poll briefly as some versions populate after approval
      let addrs: string[] = []
      const tryGet = async () => (api.getAccounts ? await api.getAccounts() : (api.requestAccounts ? await api.requestAccounts() : []))
      addrs = await tryGet()
      if (!addrs?.length) {
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 200))
          addrs = await tryGet()
          if (addrs?.length) break
        }
      }
      const addr = addrs?.[0]
      if (!addr) throw new Error('UniSat did not return an address. Please approve the connection in the UniSat popup, then try again.')
      setProvider('unisat')
      setAddress(addr)
      try { localStorage.setItem('bf_wallet_address', addr); localStorage.setItem('bf_wallet_provider', 'unisat') } catch {}

      // 1) Start verification to get server nonce/message
      setStatus('Getting verification challenge')
      const res1 = await fetch('/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, provider: 'unisat' }),
      })
      const j1 = await res1.json()
      if (!res1.ok) throw new Error(j1?.error || 'Failed to start verification')
      const message: string = j1?.message

      // 2) User signs the message
      if (!api.signMessage) throw new Error('Wallet does not support signMessage')
      setStatus('Requesting wallet signature')
      const signature = await api.signMessage(message)

      // 3) Complete verification (log signature for now)
      setStatus('Verifying signature')
      const res2 = await fetch('/api/verify/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, provider: 'unisat', message, signature }),
      })
      const j2 = await res2.json()
      if (!res2.ok) throw new Error(j2?.error || 'Verification failed')
      setVerificationId(j2?.verificationId || null)

      // 4) Fetch holdings via free Hiro API
      setStatus('Loading Bitcoin Frogs')
      const res3 = await fetch(`/api/holdings?address=${encodeURIComponent(addr)}`)
      const j3 = await res3.json()
      if (!res3.ok) throw new Error(j3?.error || 'Holdings check failed')
      setHoldCount(typeof j3?.count === 'number' ? j3.count : 0)
      setNumbers(Array.isArray(j3?.numbers) ? j3.numbers : [])
      setStatus(null)
    } catch (e: any) {
      setError(e?.message || 'Failed to connect wallet')
    } finally {
      setLoading(false)
      // If an error occurred, clear status here as well
      // (noop if already cleared after success)
      setStatus((s) => (s && error ? null : s))
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      const w: any = window as any
      if (provider === 'unisat' && w.unisat?.disconnect) await w.unisat.disconnect()
      if (provider === 'okx' && w.okxwallet?.bitcoin?.disconnect) await w.okxwallet.bitcoin.disconnect()
      const xv = w.xverseProviders?.bitcoin || w.xverse?.bitcoin || w.btc || w.BitcoinProvider
      if (provider === 'xverse' && xv?.disconnect) await xv.disconnect()
    } catch {}
    setProvider(null)
    setAddress(null)
    setHoldCount(null)
    setNumbers([])
    setVerificationId(null)
    setConfirmed(false)
    setError(null)
    setLoading(false)
    try { localStorage.removeItem('bf_wallet_address'); localStorage.removeItem('bf_wallet_provider') } catch {}
  }, [provider])

  const startX = useCallback(() => {
    if (!address) {
      setError('Connect your wallet first to link X')
      return
    }
    setStatus('Redirecting to X')
    window.location.href = `/api/x/start?address=${encodeURIComponent(address)}`
  }, [address])

  const connectOKX = useCallback(async () => {
    setError(null)
    setLoading(true)
    setProvider('okx')
    setStatus('Connecting to OKX Wallet')
    try {
      const api = (window as any).okxwallet?.bitcoin as any
      if (!api) {
        setInstallOKXOpen(true)
        setLoading(false)
        setProvider(null)
        setStatus(null)
        return
      }
      try {
        if (api.requestAccounts) await api.requestAccounts()
      } catch (e: any) {
        setError(e?.message || 'Please approve the OKX connection popup or unlock your wallet.')
      }
      let addrs: string[] = []
      const tryGet = async () => (api.getAccounts ? await api.getAccounts() : (api.requestAccounts ? await api.requestAccounts() : []))
      addrs = await tryGet()
      if (!addrs?.length) {
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 200))
          addrs = await tryGet()
          if (addrs?.length) break
        }
      }
      const addr = addrs?.[0]
      if (!addr) throw new Error('OKX did not return an address. Please approve the connection popup, then try again.')
      setProvider('okx')
      setAddress(addr)
      try { localStorage.setItem('bf_wallet_address', addr); localStorage.setItem('bf_wallet_provider', 'okx') } catch {}

      setStatus('Getting verification challenge')
      const res1 = await fetch('/api/verify/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, provider: 'okx' }),
      })
      const j1 = await res1.json(); if (!res1.ok) throw new Error(j1?.error || 'Failed to start verification')
      const message: string = j1?.message

      if (!api.signMessage) throw new Error('Wallet does not support signMessage')
      setStatus('Requesting wallet signature')
      const signature = await api.signMessage(message)

      setStatus('Verifying signature')
      const res2 = await fetch('/api/verify/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, provider: 'okx', message, signature }),
      })
      const j2 = await res2.json(); if (!res2.ok) throw new Error(j2?.error || 'Verification failed')
      setVerificationId(j2?.verificationId || null)

      setStatus('Loading Bitcoin Frogs')
      const res3 = await fetch(`/api/holdings?address=${encodeURIComponent(addr)}`)
      const j3 = await res3.json(); if (!res3.ok) throw new Error(j3?.error || 'Holdings check failed')
      setHoldCount(typeof j3?.count === 'number' ? j3.count : 0)
      setNumbers(Array.isArray(j3?.numbers) ? j3.numbers : [])
      setStatus(null)
    } catch (e: any) {
      setError(e?.message || 'Failed to connect wallet')
    } finally {
      setLoading(false)
      setStatus((s) => (s && error ? null : s))
    }
  }, [])

  const connectXverse = useCallback(async () => {
    setError(null)
    setLoading(true)
    setProvider('xverse')
    setStatus('Connecting to Xverse')
    try {
      // Prefer Sats Connect to avoid extension errors about purposes
      let ordAddress: string | null = null
      let payAddress: string | null = null
      const ord = (AddressPurpose as any)?.Ordinals || 'ordinals'
      const pay = (AddressPurpose as any)?.Payment || 'payment'
      const tries: Array<any[]> = [[ord], [pay], [ord, pay]]
      setStatus('Requesting Xverse addresses')
      for (const purposes of tries) {
        try {
          const addrResp: any = await scGetAddress(purposes)
          const addrs: Array<{ address: string; purpose: string }>
            = Array.isArray(addrResp?.addresses) ? addrResp.addresses : []
          ordAddress = addrs.find((a) => (a.purpose || '').toLowerCase() === 'ordinals')?.address || null
          payAddress = addrs.find((a) => (a.purpose || '').toLowerCase() === 'payment')?.address || null
          if (!ordAddress && addrs[0]?.address) ordAddress = addrs[0].address
          if (ordAddress) break
        } catch (e) {
          ordAddress = null
        }
      }

      // Legacy fallback to provider if Sats Connect failed
      if (!ordAddress) {
        const api = (window as any).xverseProviders?.bitcoin || (window as any).btc || (window as any).BitcoinProvider || (window as any).xverse?.bitcoin
        if (!api) {
          setInstallXverseOpen(true)
          setLoading(false)
          setProvider(null)
          setStatus(null)
          return
        }
        try {
          if (api.requestAccounts) await api.requestAccounts()
          else if (api.connect) await api.connect()
        } catch (e: any) {
          setError(e?.message || 'Please approve the Xverse connection popup or unlock your wallet.')
        }
        let addrs: string[] = []
        if (api.getAccounts) addrs = await api.getAccounts()
        else if (api.requestAccounts) addrs = await api.requestAccounts()
        ordAddress = addrs?.[0] || null
      }

      if (!ordAddress) throw new Error('Xverse did not return an address. Please approve the connection popup, then try again.')
      // Helper: start->sign->complete for a specific address
      const attempt = async (addr: string): Promise<boolean> => {
        setStatus('Getting verification challenge')
        const res1 = await fetch('/api/verify/start', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addr, provider: 'xverse' }),
        })
        const j1 = await res1.json(); if (!res1.ok) throw new Error(j1?.error || 'Failed to start verification')
        const message: string = j1?.message

        let signature: string | null = null
        // Prefer BIP-322 for Taproot
        if (addr?.toLowerCase().startsWith('bc1p')) {
          try {
            setStatus('Requesting wallet signature (BIP-322)')
            const webbtc: any = (window as any).btc || (window as any).BitcoinProvider
            if (webbtc?.request) {
              const resp = await webbtc.request('signMessage', { address: addr, message, type: 'bip322-simple' })
              signature = (resp && (resp.signature || resp.result || resp)) || null
            }
          } catch {}
        }
        if (!signature) {
          try {
            setStatus('Requesting wallet signature')
            const api = (window as any).xverseProviders?.bitcoin || (window as any).xverse?.bitcoin
            if (api?.signMessage) {
              signature = await api.signMessage(message)
            }
          } catch {}
        }
        if (!signature) {
          try {
            setStatus('Requesting wallet signature')
            const webbtc: any = (window as any).btc || (window as any).BitcoinProvider
            if (webbtc?.request) {
              try {
                const resp = await webbtc.request('signMessage', { address: addr, message })
                signature = (resp && (resp.signature || resp.result || resp)) || null
              } catch {
                const resp2 = await webbtc.request('signMessage', { payload: { address: addr, message, network: { type: 'Mainnet' } } })
                signature = (resp2 && (resp2.signature || resp2.result || resp2?.messageSignature || resp2)) || null
              }
            }
          } catch {}
        }
        if (!signature) {
          try {
            setStatus('Requesting wallet signature')
            const signResp: any = await scSignMessage(addr, message)
            signature = signResp?.messageSignature || null
          } catch {}
        }
        if (!signature) return false

        setStatus('Verifying signature')
        const res2 = await fetch('/api/verify/complete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addr, provider: 'xverse', message, signature }),
        })
        if (res2.status === 422) return false
        const j2 = await res2.json(); if (!res2.ok) throw new Error(j2?.error || 'Verification failed')
        setProvider('xverse')
        setAddress(addr)
        try { localStorage.setItem('bf_wallet_address', addr); localStorage.setItem('bf_wallet_provider', 'xverse') } catch {}
        setVerificationId(j2?.verificationId || null)
        return true
      }

      // Try Ordinals first; if signature invalid, try Payment
      let ok = false
      if (ordAddress) ok = await attempt(ordAddress)
      if (!ok) setStatus('Retrying with payment address')
      if (!ok && payAddress && payAddress !== ordAddress) ok = await attempt(payAddress)
      if (!ok) throw new Error('Verification failed (Xverse)')

      setStatus('Loading Bitcoin Frogs')
      const res3 = await fetch(`/api/holdings?address=${encodeURIComponent((address || ordAddress || payAddress)!)}`)
      const j3 = await res3.json(); if (!res3.ok) throw new Error(j3?.error || 'Holdings check failed')
      setHoldCount(typeof j3?.count === 'number' ? j3.count : 0)
      setNumbers(Array.isArray(j3?.numbers) ? j3.numbers : [])
      setStatus(null)
    } catch (e: any) {
      setError(e?.message || 'Failed to connect wallet')
    } finally {
      setLoading(false)
      setStatus((s) => (s && error ? null : s))
    }
  }, [])

  async function confirmVerify() {
    if (!address) return
    setLoading(true)
    setError(null)
    setClaimConflicts(null)
    try {
      const reservedText = 'RESERVED_PLACEHOLDER'
      const res = await fetch('/api/verify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, provider: provider || 'unisat', numbers, reservedText }),
      })
      if (res.status === 409) {
        const j = await res.json()
        const conflicts: number[] = Array.isArray(j?.conflicts) ? j.conflicts : []
        setClaimConflicts(conflicts)
        throw new Error('Some frogs are already claimed')
      }
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Confirm failed')
      setConfirmed(true)
    } catch (e: any) {
      setError(e?.message || 'Confirm failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto text-center text-black">
      {!address && (
        <h2 className="font-8bit text-xl md:text-2xl mb-4">CONNECT YOUR WALLET TO RIBBIT</h2>
      )}
      {status && (
        <div className="mt-1 text-[11px] font-press opacity-80">{status}</div>
      )}

      {!address ? (
        <div className="space-y-2 font-press text-[12px]">
          <button onClick={hasOKX ? connectOKX : () => setInstallOKXOpen(true)} disabled={loading} className="w-full py-2.5 rounded border border-black/30 bg-black/5 hover:bg-black/10 transition">
            {hasOKX ? (loading && provider === 'okx' ? 'Connecting' : 'OKX Wallet') : 'Install OKX Wallet'}
          </button>
          <button onClick={hasUniSat ? connectUniSat : () => setInstallOpen(true)} disabled={loading} className="w-full py-2.5 rounded border border-black/30 bg-black/5 hover:bg-black/10 transition">
            {hasUniSat ? (loading && provider === 'unisat' ? 'Connecting' : 'UniSat Wallet') : 'Install UniSat Wallet'}
          </button>
          <button onClick={hasXverse ? connectXverse : () => setInstallXverseOpen(true)} disabled={loading} className="w-full py-2.5 rounded border border-black/30 bg-black/5 hover:bg-black/10 transition">
            {hasXverse ? (loading && provider === 'xverse' ? 'Connecting' : 'Xverse Wallet') : 'Install Xverse Wallet'}
          </button>
        </div>
      ) : (
        <div className="font-press text-[12px] space-y-3 mt-1">
          <div className="space-y-2">
            <div className="font-mono text-[12px] break-all">{address}</div>
            <button onClick={disconnect} className="inline-flex items-center h-8 px-3 rounded border border-black/30 bg-black/5 hover:bg-black/10 transition text-[11px]">
              Disconnect
            </button>
          </div>

          {holdCount !== null && holdCount > 0 ? (
            <div className="space-y-2">
              <div>It looks like you hold <strong>{holdCount}</strong> frogs.</div>
              <div className="text-xs opacity-80 break-words">#{numbers.slice(0, 12).join(', ')}{numbers.length > 12 ? '' : ''}</div>
              <button onClick={confirmVerify} disabled={loading} className="w-full py-2.5 rounded border border-black/30 bg-black/5 hover:bg-black/10 transition">
                {loading ? 'Verifying' : `Verify and reserve [REDACTED] for Bitcoin Frogs`}
              </button>
              {claimConflicts && claimConflicts.length > 0 && (
                <div className="text-red-800 text-[11px]">Already claimed: #{claimConflicts.join(', #')}</div>
              )}
              {confirmed && <div className="text-green-800">Verified!</div>}
            </div>
          ) : holdCount !== null ? (
            <div className="space-y-2">
              <div className="font-semibold">OOPS, IT LOOKS LIKE YOU HAVE 0 FROGS BUT IT'S OKAY.</div>
              <div>Connect your X for [REDACTED]</div>
            </div>
          ) : null}

          <div className="pt-2">
            <button onClick={startX} disabled={!address || loading} className="w-full py-2.5 rounded border border-black/30 bg-black/5 hover:bg-black/10 transition">
              {address ? 'Verify X' : 'Connect wallet to verify X'}
            </button>
            {twitter && (
              <div className="mt-2 text-left text-[11px] font-press space-y-1">
                <div>Connected X: {twitter.handle ? `@${twitter.handle}` : 'unknown'}</div>
              </div>
            )}
            <div className="mt-2 flex items-center justify-center gap-2 text-[11px]">
              <a className="underline hover:opacity-80" href="https://x.com/joinfroggys" target="_blank" rel="noopener noreferrer">Follow</a>
              <span>·</span>
              <a className="underline hover:opacity-80" href={
                `https://x.com/intent/tweet?text=${encodeURIComponent("Believe it or not, @BitcoinFrogs are still undervalued. Here's why: https://www.bitcoinfrogs.art")}`
              } target="_blank" rel="noopener noreferrer">Tweet</a>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-red-800 text-[11px] font-press">
          {error}
          <div className="mt-2">
            <button
              onClick={() => {
                if (error && error.startsWith('X not connected')) return startX()
                if (provider === 'xverse') return connectXverse()
                if (provider === 'okx') return connectOKX()
                return connectUniSat()
              }}
              className="underline hover:opacity-80"
            >
              {error && error.startsWith('X not connected') ? 'Reconnect X' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* Install UniSat Modal */}
      {installOpen && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setInstallOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-[#f6a23e] text-black border border-black/30 shadow-2xl rounded p-4 w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-8bit text-base">UniSat Extension Missing</div>
                <button onClick={() => setInstallOpen(false)} className="font-press text-[10px] hover:opacity-80">âœ•</button>
              </div>
              <p className="font-press text-[12px] mb-3">Install UniSat to connect your Bitcoin wallet.</p>
              <div className="flex flex-col gap-2">
                <a
                  className="text-center w-full py-2.5 rounded border border-black/30 bg-black/5 hover:bg-black/10 transition font-press text-[12px]"
                  href="https://unisat.io/download"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get UniSat Wallet
                </a>
                <button onClick={() => setInstallOpen(false)} className="font-press text-[12px] py-2.5 hover:opacity-80">Maybe later</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install OKX Modal */}
      {installOKXOpen && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setInstallOKXOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-[#f6a23e] text-black border border-black/30 shadow-2xl rounded p-4 w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-8bit text-base">OKX Wallet Missing</div>
                <button onClick={() => setInstallOKXOpen(false)} className="font-press text-[10px] hover:opacity-80">âœ•</button>
              </div>
              <p className="font-press text-[12px] mb-3">Install OKX Wallet to connect your Bitcoin wallet.</p>
              <div className="flex flex-col gap-2">
                <a
                  className="text-center w-full py-2.5 rounded border border-black/30 bg-black/5 hover:bg-black/10 transition font-press text-[12px]"
                  href="https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get OKX Wallet
                </a>
                <button onClick={() => setInstallOKXOpen(false)} className="font-press text-[12px] py-2.5 hover:opacity-80">Maybe later</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install Xverse Modal */}
      {installXverseOpen && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setInstallXverseOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-[#f6a23e] text-black border border-black/30 shadow-2xl rounded p-4 w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-8bit text-base">Xverse Wallet Missing</div>
                <button onClick={() => setInstallXverseOpen(false)} className="font-press text-[10px] hover:opacity-80">âœ•</button>
              </div>
              <p className="font-press text-[12px] mb-3">Install Xverse to connect your Bitcoin wallet.</p>
              <div className="flex flex-col gap-2">
                <a
                  className="text-center w-full py-2.5 rounded border border-black/30 bg-black/5 hover:bg-black/10 transition font-press text-[12px]"
                  href="https://www.xverse.app/download"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Xverse Wallet
                </a>
                <button onClick={() => setInstallXverseOpen(false)} className="font-press text-[12px] py-2.5 hover:opacity-80">Maybe later</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
