'use client'

import PageLayout from "@/components/UI/PageLayout"
import { RiTrophyLine } from "react-icons/ri"

export default function LeaderboardPage() {
  return (
    <PageLayout className="min-h-screen flex flex-col items-start justify-start">
      <div className="w-full max-w-6xl mx-auto mt-8">
        <div className="bg-white/10 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 gradient-button rounded-full flex items-center justify-center">
              <RiTrophyLine className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">The Winner Circle</h3>
              <p className="text-caption mb-4">
                Coming Soon!
              </p>
              <p className="text-sm text-caption">
                The leaderboard feature is under development. Check back soon to see top bidders and auction winners!
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

