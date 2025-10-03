export default function AboutContent() {
      return (
        <main className="space-y-6 md:space-y-7 text-black font-press text-[10px] md:text-[11px] leading-relaxed">
          <header className="space-y-2">
            <div className="uppercase tracking-wide">Archive</div>
            <h1 className="font-8bit text-2xl md:text-3xl">About Bitcoin Frogs</h1>
            <p>
              Bitcoin Frogs is a collection of 10,000 pixelated frogs inscribed directly on the Bitcoin blockchain via the <a href="https://docs.ordinals.com/" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Ordinals</a> protocol. Released on March 8, 2023 by the pseudonymous artist <a href="https://x.com/Frogtoshi_" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Frogtoshi Nakamoto</a> with support from <a href="https://x.com/deezy_inc" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Deezy Labs</a>, the project quickly became one of the most recognizable and culturally significant collections in the history of Ordinals.
            </p>
            <p>
              <strong>This page serves as a long-form archival overview: history, technical context, culture, market impact, and why the collection merits high-standard preservation.</strong>
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="font-8bit text-xl">Origins and Significance</h2>
            <p>
              The timing was pivotal. Ordinals had launched only weeks earlier, and <a href="https://x.com/bitcoinfrogs" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Bitcoin Frogs</a> set out to prove that a full-scale generative PFP collection could thrive natively on Bitcoin. It became the first 10,000-piece Ordinals drop to mint through the Lightning Network, offered as a free mint where collectors paid only network fees. The simple creative prompt "put 10,000 frogs on Bitcoin at all costs" grew into a defining moment for the early Ordinals era.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-8bit text-xl">Early Days and Technical Innovation</h2>
            <p>
              Deezy Labs' launchpad enabled Lightning invoices to cover inscription fees, bridging Layer 2 payments with Layer 1 permanence. The frogs occupy inscription numbers roughly in the #381,224–#412,389 range, embedding each piece forever into the Bitcoin ledger.
            </p>
            <p>
              Frogtoshi implemented equal trait rarity across the art layers, encouraging collectors to choose by aesthetics or the underlying satoshi's provenance rather than a rarity ladder. This design quietly foregrounded a uniquely Bitcoin concept: <em>satoshi rarity</em>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-8bit text-xl">Naked Frogs and Mint Challenges</h2>
            <p>
              A bug during the March 2023 mint left about 2,000 frogs missing their clothing layers, quickly nicknamed “Naked Frogs” or “Misprint Frogs.” The glitch became part of the lore.
            </p>
            <p>
              The Lightning-based mint also revealed early hurdles with invoice timing and Bitcoin’s block limits, lessons that helped shape better Ordinals tools and user experiences later on.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-8bit text-xl">Cultural Impact</h2>
            <p>
              Bitcoin Frogs landed at the intersection of Bitcoin maximalism, NFT experimentation, and long-running internet frog memes. Slogans like “frogs follow frogs” and an ever-present <strong>“ribbit”</strong> gave the collection a playful identity that spread across Twitter/X and Discord. The frogs became recognizable avatars and a banner for Ordinals culture.
            </p>
            <p>
              In May 2023, the collection briefly surpassed Ethereum’s Bored Ape Yacht Club in 24-hour trading volume, a headline moment that signaled the arrival of Bitcoin NFTs to a wider audience. At events such as NFT NYC, community members onboarded newcomers by helping them set up wallets and gifting frogs, turning the collection into a tool for education and adoption as much as a collectible.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-8bit text-xl">Market Performance and Community</h2>
            <p>
              Holder distribution remains broad, with several thousand unique owners worldwide. The collection’s social—memes, PFPs, and shared lore—has proven durable beyond initial hype, and the frogs still serve as a gateway collectible for people exploring Bitcoin Ordinals.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-8bit text-xl">Legacy and Impact</h2>
            <p>
              Every image is an immutable inscription on Bitcoin. The art does not point to an external server; it lives in the ledger itself. For future historians, this permanence and the surrounding social history are as significant as the pixels.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-8bit text-xl">Why Archive Bitcoin Frogs</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <h3 className="font-8bit text-lg">Pioneering Status</h3>
                <p>
                  As one of the earliest large-scale Ordinals collections, Bitcoin Frogs documents the moment NFTs and digital art became native to Bitcoin and proved viable at scale.
                </p>
                <h3 className="font-8bit text-lg">Cultural Context</h3>
                <p>
                  The frogs channel a deep seam of internet meme culture and crypto aesthetics. Preserving the imagery alongside community language, memes, and events keeps that culture legible.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-8bit text-lg">Technical Uniqueness</h3>
                <p>
                  On-chain permanence, Lightning-assisted minting, and equal trait rarity make the collection an educational artifact for how Bitcoin inscriptions differ from contract-based NFTs.
                </p>
                <h3 className="font-8bit text-lg">Collector Heritage</h3>
                <p>
                  Fixed supply, broad distribution, and evolving social value argue for museum-grade preservation: pristine images, provenance notes, and a clear record of the lore.
                </p>
              </div>
            </div>
            <p>
              Archival standards: preserve full-resolution images; record inscription IDs and ranges; document the “naked frogs” incident, Lightning mint workflow, major market milestones, and notable community moments.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-8bit text-xl">Scope of This Archive</h2>
            <p>
              This archive aims to present the complete collection with accurate metadata, canonical imagery, and curated context. It includes a timeline of key events, references to significant sales and exhibitions, terminology and memes, and guidance for viewing inscriptions via Ordinals explorers and supported wallets.
            </p>
          </section>
        </main>
      )
    }
