'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

const cards = [
  {
    title: "Create Flexible Auctions",
    description: "Launch auctions with any ERC20 token on Base. Choose your token, set minimum bid and end time—your auction goes live instantly on-chain for global bidders.",
    icon: "🎯"
  },
  {
    title: "Fair & Instant Bidding",
    description: "Place bids with confidence—your tokens are held securely in the smart contract. Get outbid? Instant automatic refund, no fees. Auctions end when owners decide.",
    icon: "⚡"
  },
  {
    title: "Weekly Rewards",
    description: "Top earners and bidders on the global leaderboard receive weekly rewards. Create auctions, place bids, climb rankings—the more you engage, the more you earn.",
    icon: "🏆"
  }
]

export default function InfoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

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
    <div className="w-full max-w-6xl mx-auto my-8 min-h-40">
      {/* Desktop: Show all cards */}
      <div className="hidden lg:flex gap-6 justify-start">
        {cards.map((card, index) => (
          <div key={index} className="w-80">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl h-full">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-4xl">{card.icon}</div>
                <h3 className="text-xl font-bold text-white flex-1 gradient-text">
                  {card.title}
                </h3>
              </div>
              <p className="text-gray-200 leading-relaxed">
                {card.description}
              </p>
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
                  <p className="text-gray-200 leading-relaxed">
                    {cards[currentIndex].description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-10">
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
      </div>
    </div>
  )
}
