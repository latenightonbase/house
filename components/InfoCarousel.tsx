'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

const cards = [
  {
    title: "Create Auctions in Seconds",
    bullets: [
      "Launch onchain auctions with any Base token.",
      "Pick your token → set a min bid → go live instantly."
    ],
    icon: "🎯"
  },
  {
    title: "Fair, Instant, Onchain Bidding",
    bullets: [
      "Your bid is held safely in the contract.",
      "Get outbid? Auto-refund. Zero fees. No rug pulls."
    ],
    icon: "⚡"
  },
  {
    title: "Earn Weekly Rewards",
    bullets: [
      "Top bidders & top earners get paid every week.",
      "Bid, win, host, climb the leaderboard."
    ],
    icon: "🏆"
  }
]

export default function InfoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      paginate(1)
    }, 10000)
    
    return () => clearInterval(interval)
  }, [currentIndex])

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  }

  const swipeConfidenceThreshold = 10000
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity
  }

  const paginate = (newDirection: number) => {
    setDirection(newDirection)
    setCurrentIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection
      if (nextIndex < 0) nextIndex = cards.length - 1
      if (nextIndex >= cards.length) nextIndex = 0
      return nextIndex
    })
  }

  return (
    <div className="w-full max-w-6xl max-lg:mx-auto my-8 min-h-40">
      {/* Desktop: Show all cards */}
      <div className="hidden lg:flex gap-6 lg:justify-start lg:items-center w-full">
        {cards.map((card, index) => (
          <div key={index} className="w-80">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl h-full">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-4xl">{card.icon}</div>
                <h3 className="text-xl font-bold text-white flex-1 gradient-text">
                  {card.title}
                </h3>
              </div>
              <ul className="space-y-2">
                {card.bullets.map((bullet, idx) => (
                  <li key={idx} className="text-gray-200 leading-relaxed flex items-start">
                    <span className="mr-2 text-primary">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: Carousel */}
      <div className="lg:hidden">
        <div className="relative">
          <div className="min-h-[200px] relative">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = swipePower(offset.x, velocity.x)

                  if (swipe < -swipeConfidenceThreshold) {
                    paginate(1)
                  } else if (swipe > swipeConfidenceThreshold) {
                    paginate(-1)
                  }
                }}
                className="absolute w-full"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-xl">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-2xl">{cards[currentIndex].icon}</div>
                    <h3 className="text-xl font-bold text-white flex-1 gradient-text">
                      {cards[currentIndex].title}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {cards[currentIndex].bullets.map((bullet, idx) => (
                      <li key={idx} className="text-gray-200 leading-relaxed flex items-start">
                        <span className="mr-2 text-primary">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            onClick={() => paginate(-1)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all"
            aria-label="Previous card"
          >
            <FaChevronLeft className="text-white text-lg" />
          </button>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              {cards.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentIndex ? 1 : -1)
                    setCurrentIndex(index)
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to card ${index + 1}`}
                />
              ))}
            </div>
            <div className="text-white/60 text-sm">
              {currentIndex + 1} / {cards.length}
            </div>
          </div>

          <button
            onClick={() => paginate(1)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all"
            aria-label="Next card"
          >
            <FaChevronRight className="text-white text-lg" />
          </button>
        </div>
      </div>
    </div>
  )
}
