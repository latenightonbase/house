'use client'

import PageLayout from "@/components/UI/PageLayout"
import Heading from "@/components/UI/Heading"
import { RiRocketLine, RiLightbulbLine, RiGroupLine, RiMoneyDollarCircleLine, RiShieldCheckLine, RiTrophyLine, RiQuestionLine } from "react-icons/ri"

export default function InfoPage() {
  return (
    <PageLayout className="min-h-screen flex flex-col items-center justify-start">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <RiQuestionLine className="text-3xl text-primary" />
            </div>
          </div>
          <Heading className="mb-4" size="lg">How HOUSE Works</Heading>
          <p className="text-caption max-w-3xl mx-auto">
            Everything you need to know about creating auctions, bidding, and earning rewards on the platform
          </p>
        </div>
        
        {/* Main Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* How to Start as a Creator */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/20 p-8 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <RiRocketLine className="text-2xl text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">How to Start as a Creator</h3>
            <p className="text-caption leading-relaxed">
              Connect your wallet, link your Twitter account for verification, and create your first auction. Set your terms including currency, minimum bid, and auction duration. Share your auction with your community and watch the bids roll in.
            </p>
          </div>

          {/* What Makes HOUSE Different */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/20 p-8 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <RiLightbulbLine className="text-2xl text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">What Makes HOUSE Different</h3>
            <p className="text-caption leading-relaxed">
              HOUSE is built on transparency and community. All bids are on-chain, ensuring fairness. Our reward system gives back to active participants. Plus, with flexible currency options and easy-to-use interface, anyone can participate.
            </p>
          </div>

          {/* For Bidders & Brands */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/20 p-8 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <RiGroupLine className="text-2xl text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">For Bidders & Brands</h3>
            <p className="text-caption leading-relaxed">
              Browse active auctions, place competitive bids, and win exclusive digital assets. Track your bidding activity, claim your winnings, and earn rewards for participation. The more you engage, the more you earn.
            </p>
          </div>

          {/* Settlement & Payments */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/20 p-8 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <RiMoneyDollarCircleLine className="text-2xl text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Settlement & Payments</h3>
            <p className="text-caption leading-relaxed">
              When an auction ends, the highest bidder wins. Creators can claim their revenue, and winners can claim their prizes. All transactions are secure and processed on the Base chain for fast, low-cost settlements.
            </p>
          </div>

          {/* What Happens When Auction Ends */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/20 p-8 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <RiShieldCheckLine className="text-2xl text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">What Happens When Auction Ends</h3>
            <p className="text-caption leading-relaxed">
              The auction creator can end the auction manually or it ends automatically at the set time. The highest bidder is declared winner and can claim their prize. Smart contracts ensure fair and transparent outcomes.
            </p>
          </div>

          {/* Weekly Rewards Program */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/20 p-8 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <RiTrophyLine className="text-2xl text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Weekly Rewards Program</h3>
            <p className="text-caption leading-relaxed">
              Earn 1% cashback on all your bidding activity each week. The more you participate, the more you earn. Track your weekly stats and claim your rewards at the end of each cycle.
            </p>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/30 p-10">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Quick Start Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Connect Wallet</h3>
              <p className="text-caption text-sm">
                Link your crypto wallet to get started
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Browse or Create</h3>
              <p className="text-caption text-sm">
                Explore auctions or create your own
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Participate</h3>
              <p className="text-caption text-sm">
                Place bids or manage your auctions
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                4
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Earn & Claim</h3>
              <p className="text-caption text-sm">
                Win auctions and claim rewards
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

