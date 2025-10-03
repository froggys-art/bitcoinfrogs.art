"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import FrogShuffle from './components/FrogShuffle'
import AboutContent from './components/AboutContent'
import FAQContent from './components/FAQContent'
import GalleryGrid from './components/GalleryGrid'
import FilterDrawer, { type TraitGroup, type SelectedMap } from './components/FilterDrawer'
import ImageModal, { type ViewerItem } from './components/ImageModal'
const VerifyPanel = dynamic(() => import('./components/VerifyPanel'), { ssr: false })

export default function HomePage() {
  const [view, setView] = useState<'hero' | 'about' | 'gallery' | 'verify' | 'faq'>('hero')
  // Filters
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [traits, setTraits] = useState<TraitGroup[]>([])
  const [selected, setSelected] = useState<SelectedMap>({})
  // Results
  const [items, setItems] = useState<Array<{ num: number; name?: string; src: string; attributes?: any[] }>>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  // Viewer
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerItem, setViewerItem] = useState<ViewerItem | undefined>(undefined)
  // Drawer positioning relative to gallery viewport
  const galleryRef = useRef<HTMLDivElement | null>(null)
  const [drawerRect, setDrawerRect] = useState<{ top: number; left: number; height: number } | null>(null)
  // Count selected filters
  const selectedCount = useMemo(() => {
    let n = 0
    for (const arr of Object.values(selected)) n += Array.isArray(arr) ? arr.length : 0
    return n
  }, [selected])

  // Fetch traits lazily when gallery opens first time
  useEffect(() => {
    if (view !== 'gallery' || traits.length > 0) return
    fetch('/api/frogs/traits')
      .then((r) => r.json())
      .then((d) => {
        const list: TraitGroup[] = Array.isArray(d?.types) ? d.types : []
        setTraits(list)
      })
      .catch(() => {})
  }, [view, traits.length])

  // Build search query param
  const traitsParam = useMemo(() => {
    const entries = Object.entries(selected).filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
    if (entries.length === 0) return ''
    try {
      const obj: Record<string, string[]> = {}
      for (const [k, v] of entries) obj[k] = v
      return encodeURIComponent(JSON.stringify(obj))
    } catch {
      return ''
    }
  }, [selected])

  // Fetch results when gallery open or filters change
  useEffect(() => {
    if (view !== 'gallery') return
    const url = traitsParam ? `/api/frogs/search?traits=${traitsParam}` : '/api/frogs/search'
    setLoading(true)
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.items) ? d.items : []
        setItems(list)
        setCount(typeof d?.count === 'number' ? d.count : list.length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [view, traitsParam])

  // Ensure drawer is closed when leaving gallery view
  useEffect(() => {
    if (view !== 'gallery' && drawerOpen) setDrawerOpen(false)
  }, [view, drawerOpen])

  // Ensure image viewer closes when leaving gallery
  useEffect(() => {
    if (view !== 'gallery' && viewerOpen) setViewerOpen(false)
  }, [view, viewerOpen])

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (viewerOpen) setViewerOpen(false)
        if (drawerOpen) setDrawerOpen(false)
      }
    }
    if (viewerOpen || drawerOpen) {
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [viewerOpen, drawerOpen])

  // Keep drawer aligned with the visible gallery viewport
  useEffect(() => {
    if (view !== 'gallery') return
    const el = galleryRef.current
    function update() {
      const r = el?.getBoundingClientRect()
      if (!r) return
      setDrawerRect({ top: r.top, left: r.left, height: r.height })
    }
    update()
    window.addEventListener('resize', update)
    el?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      el?.removeEventListener('scroll', update)
    }
  }, [view])

  function toggleTrait(trait: string, value: string) {
    setSelected((prev) => {
      const arr = new Set(prev[trait] || [])
      if (arr.has(value)) arr.delete(value)
      else arr.add(value)
      return { ...prev, [trait]: Array.from(arr) }
    })
  }
  function clearAll() {
    setSelected({})
  }
  function handleSelectItem(p: { src: string; num?: number; index: number }) {
    const it = items[p.index]
    if (!it) return
    setViewerItem({ src: it.src, num: it.num, name: it.name, attributes: it.attributes || [] })
    setViewerOpen(true)
  }
  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden"
      style={{ background: '#f6931a' }}
    >
      {/* Header/title/nav fixed near top */}
      <div className="absolute inset-x-0 top-[clamp(12px,5vh,64px)] md:top-[clamp(40px,8vh,96px)] px-2 text-center z-20">
        <div className="flex flex-col items-center gap-[2px] md:gap-1">
          <h1
            className="font-8bit text-white text-3xl md:text-5xl tracking-wide cursor-pointer"
            onClick={() => setView('hero')}
          >
            BITCOIN FROGS
          </h1>
          <nav className="mt-0.5 md:mt-2 flex items-center justify-center gap-4 font-press text-xs sm:text-sm">
            <a
              href="/#about"
              onClick={(e) => { e.preventDefault(); setView('about'); }}
              className={`${view === 'about' ? 'text-black' : 'text-white'} hover:opacity-80`}
            >
              ABOUT
            </a>
            <a
              href="/#gallery"
              onClick={(e) => { e.preventDefault(); setView('gallery'); }}
              className={`${view === 'gallery' ? 'text-black' : 'text-white'} hover:opacity-80`}
            >
              GALLERY
            </a>
            <a
              href="/#verify"
              onClick={(e) => { e.preventDefault(); setView('verify'); }}
              className={`${view === 'verify' ? 'text-black' : 'text-white'} hover:opacity-80`}
            >
              VERIFY
            </a>
            <a
              href="/#faq"
              onClick={(e) => { e.preventDefault(); setView('faq'); }}
              className={`${view === 'faq' ? 'text-black' : 'text-white'} hover:opacity-80`}
            >
              FAQ
            </a>
          </nav>
        </div>
      </div>

      {/* Center content (fixed size, centered) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl z-10" style={{ height: 'clamp(300px,55vh,760px)' }}>
          {/* Hero (image + quote) */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${view === 'hero' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col items-center justify-center text-center px-4">
              <FrogShuffle
                folder="background-bitcoin-orange"
                intervalMs={900}
                className="frog-hero"
                width={240}
                height={240}
              />
              <figure className="mt-2 md:mt-4 max-w-[280px] md:max-w-xl mx-auto">
                <blockquote className="text-[10px] md:text-[12px] leading-tight text-black">
                  "One fine day I woke up and wanted to put 10,000 frogs on the Bitcoin blockchain at all costs."
                </blockquote>
                <figcaption className="mt-0.5 text-[10px] md:text-[12px] text-black/90">— Frogtoshi Nakamoto</figcaption>
              </figure>
            </div>
          </div>
          {/* About (scrollable) */}
          <div className={`absolute inset-0 overflow-y-auto px-4 transition-opacity duration-300 text-left scroll-blend ${view === 'about' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <AboutContent />
          </div>
          {/* Gallery (scrollable grid) */}
          <div
            ref={galleryRef}
            className={`absolute inset-0 overflow-y-auto px-4 transition-opacity duration-300 scroll-blend ${view === 'gallery' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Sticky header region keeps the toolbar anchored; drawer positioned right below */}
            <div className="sticky top-0 z-10" style={{ background: '#f6931a' }}>
              <div className="relative">
                <div className="flex items-center justify-between py-2">
                  <button onClick={() => setDrawerOpen((v) => !v)} className="font-press text-[10px] hover:opacity-80">
                    ☰ FILTERS{selectedCount ? ` (${selectedCount})` : ''}
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={clearAll}
                      disabled={selectedCount === 0}
                      className="font-press text-[10px] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      CLEAR{selectedCount ? ` (${selectedCount})` : ''}
                    </button>
                    <div className="font-press text-[10px] opacity-80">{loading ? 'Loading…' : `${count} frogs`}</div>
                  </div>
                </div>
                {/* Drawer lives directly under the toolbar and matches gallery viewport height */}
                {drawerOpen && (
                  <FilterDrawer
                    open
                    traits={traits}
                    selected={selected}
                    onToggle={toggleTrait}
                    onClearAll={clearAll}
                    onClose={() => setDrawerOpen(false)}
                    position="absolute"
                    style={{ top: '100%', left: 0, height: Math.max(120, (drawerRect?.height || 0) - 40) }}
                  />
                )}
              </div>
            </div>
            <GalleryGrid columns={5} gap={12} items={items.map((it) => ({ src: it.src, num: it.num }))} onSelect={handleSelectItem} />
          </div>
          {/* Verify (center simple panel) */}
          <div className={`absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-300 ${view === 'verify' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <VerifyPanel />
          </div>
          {/* FAQ (scrollable) */}
          <div className={`absolute inset-0 overflow-y-auto px-4 transition-opacity duration-300 text-left scroll-blend ${view === 'faq' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <FAQContent />
          </div>
        </div>

      {/* Footer (RIBBIT) fixed near bottom with dynamic offset */}
      <div className="absolute inset-x-0 px-2 text-center z-20 bottom-[clamp(12px,5vh,64px)] md:bottom-[clamp(40px,8vh,96px)]">
        <div className="relative">
          <a
            href="https://x.com/intent/tweet?in_reply_to=1969022418640396370&text=RIBBIT"
            target="_blank"
            rel="noopener noreferrer"
            className="font-8bit text-black text-4xl sm:text-5xl md:text-6xl leading-none inline-block hover:opacity-80"
          >
            RIBBIT
          </a>
        </div>
      </div>
      {/* Image viewer modal */}
      <ImageModal open={viewerOpen} item={viewerItem} onClose={() => setViewerOpen(false)} />
    </div>
  )
}
