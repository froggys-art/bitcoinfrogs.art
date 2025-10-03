"use client"

import { useState, ReactNode } from 'react'

      interface FAQItem {
        question: string
        answer: ReactNode
      }

      const faqItems: FAQItem[] = [
        {
          question: "Why Bitcoin Frogs?",
          answer:
            "Bitcoin Frogs are more than pixel art, they're one of the earliest and most culturally significant Ordinals collections. Minted in March 2023 as a free drop via the Lightning Network, they proved that community, memes, and art could thrive on the world's most secure blockchain. The frogs helped kick off Ordinals adoption, briefly flipped top Ethereum collections in daily volume, and left a permanent mark on Bitcoin's cultural history."
        },
        {
          question: "What is the verification for?",
          answer:
            "The verification is for a [REDACTED] process linked to verified Bitcoin Frogs holders. It confirms your place in the original collection and ensures eligibility for any future initiatives tied to verified frogs."
        },
        {
          question: "What's next?",
          answer: "The answer is in the text below (hint: click it)."
        }
      ]
export default function FAQContent() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }

  return (
    <main className="space-y-6 md:space-y-7 text-black font-press text-[10px] md:text-[11px] leading-relaxed">
      <header className="space-y-2">
        <div className="uppercase tracking-wide">Support</div>
        <h1 className="font-8bit text-2xl md:text-3xl">FAQ</h1>
      </header>

      <section className="space-y-3">
        {faqItems.map((item, index) => (
          <details
            key={index}
            open={openItems.has(index)}
            className="border border-black/20 rounded-xl bg-black/5 overflow-hidden"
          >
            <summary
              onClick={(e) => {
                e.preventDefault()
                toggleItem(index)
              }}
              className="list-none cursor-pointer p-4 md:p-5 flex items-center gap-3 font-semibold hover:bg-black/10 transition-colors"
            >
              <span 
                className={`text-sm transition-transform duration-200 ${
                  openItems.has(index) ? 'rotate-90' : ''
                }`}
              >
                ▶
              </span>
              <span className="flex-1 text-left">{item.question}</span>
            </summary>
            <div className="px-4 pb-4 md:px-5 md:pb-5 text-black/80 leading-relaxed">
              {item.answer}
            </div>
          </details>
        ))}
      </section>
    </main>
  )
}
