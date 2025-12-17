'use client'

import PageLayout from "@/components/UI/PageLayout"
import Heading from "@/components/UI/Heading"
import { RiAuctionLine, RiUserLine, RiCoinLine, RiTrophyLine, RiQuestionLine, RiMoneyDollarCircleLine } from "react-icons/ri"

export default function InfoPage() {
  return (
    <PageLayout className="min-h-screen flex flex-col items-start justify-start">
      <div className="w-full max-w-4xl">
        <Heading className="mb-4" size="lg">How The House Works</Heading>
        <p className="text-caption mb-8">
          HOUSE is the onchain auction marketplace where creators monetize their attention — from shoutouts to collabs to podcast slots — directly with brands and fans.
        </p>
        
        {/* For Creators Section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <RiUserLine className="text-primary" />
            For Creators
          </h2>
          
          <div className="space-y-4">
            {/* Q1 */}
            <div className="bg-white/10 rounded-lg border border-primary/30 p-5">
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-start gap-2">
                <RiQuestionLine className="text-xl flex-shrink-0 mt-0.5" />
                How do I start?
              </h3>
              <p className="text-caption ml-7">
                Click "Start Your Auction," connect your wallet or email, set your minimum bid, duration, and settlement token (USDC or your creator coin).
              </p>
            </div>

            {/* Q2 */}
            <div className="bg-white/10 rounded-lg border border-primary/30 p-5">
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-start gap-2">
                <RiQuestionLine className="text-xl flex-shrink-0 mt-0.5" />
                What happens when my auction ends?
              </h3>
              <p className="text-caption ml-7">
                The highest bidder wins instantly. You get paid directly and can deliver your promised content (no middlemen).
              </p>
            </div>

            {/* Q3 */}
            <div className="bg-white/10 rounded-lg border border-primary/30 p-5">
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-start gap-2">
                <RiQuestionLine className="text-xl flex-shrink-0 mt-0.5" />
                What makes HOUSE different?
              </h3>
              <p className="text-caption ml-7">
                Every auction is fully transparent, fair, and settles onchain — and a small portion of every deal powers the $LNOB buy + burn flywheel, rewarding the community that makes it all possible.
              </p>
            </div>
          </div>
        </div>

        {/* For Brands Section */}
        <div>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <RiMoneyDollarCircleLine className="text-primary" />
            For Brands
          </h2>
          
          <div className="space-y-4">
            {/* Q1 */}
            <div className="bg-white/10 rounded-lg border border-primary/30 p-5">
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-start gap-2">
                <RiQuestionLine className="text-xl flex-shrink-0 mt-0.5" />
                What can I do on HOUSE?
              </h3>
              <p className="text-caption ml-7">
                Bid on top creators for brand placements — shoutouts, collabs, livestream mentions, or multi-creator campaigns.
              </p>
            </div>

            {/* Q2 */}
            <div className="bg-white/10 rounded-lg border border-primary/30 p-5">
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-start gap-2">
                <RiQuestionLine className="text-xl flex-shrink-0 mt-0.5" />
                How do I know I'm getting ROI?
              </h3>
              <p className="text-caption ml-7">
                Every auction includes reach metrics and transparent bid pricing. You can even deploy your entire ad budget across multiple creators in one click.
              </p>
            </div>

            {/* Q3 */}
            <div className="bg-white/10 rounded-lg border border-primary/30 p-5">
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-start gap-2">
                <RiQuestionLine className="text-xl flex-shrink-0 mt-0.5" />
                How does payment work?
              </h3>
              <p className="text-caption ml-7">
                You can settle in USDC or the creator's native token. HOUSE takes care of routing and onchain settlement.
              </p>
            </div>

            {/* Q4 */}
            <div className="bg-white/10 rounded-lg border border-primary/30 p-5">
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-start gap-2">
                <RiQuestionLine className="text-xl flex-shrink-0 mt-0.5" />
                What's the benefit of using HOUSE?
              </h3>
              <p className="text-caption ml-7">
                You're not just buying ads — you're buying attention with engagement built in. Every deal triggers $LNOB buy + burns and fuels fans who actively promote your brand.
              </p>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="mt-12 bg-primary/10 rounded-lg border border-primary/30 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <RiTrophyLine className="text-primary" />
            Why Choose HOUSE?
          </h3>
          <ul className="space-y-2 text-caption">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Fully onchain auctions powered by smart contracts on Base</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Transparent bidding with no middlemen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Instant settlement in USDC or creator tokens</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Real-time bid updates and notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>$LNOB buy + burn mechanism rewarding the community</span>
            </li>
          </ul>
        </div>
      </div>
    </PageLayout>
  )
}

