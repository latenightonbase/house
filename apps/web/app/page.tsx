'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/button'
import Heading from '@/components/UI/Heading'
import { RiRobot2Line, RiUserLine, RiFileCopyLine, RiCheckLine } from 'react-icons/ri'
import { toast } from 'sonner'
import { useNavigateWithLoader } from '@/utils/useNavigateWithLoader'

export default function Page() {
  const router = useRouter()
  const [mode, setMode] = useState<'bot' | 'human' | null>(null)
  const [copiedConfig, setCopiedConfig] = useState(false)

  useEffect(() => {
    router.prefetch("/home")
  }, [router])

  const navigate = useNavigateWithLoader()

  const configCode = `{
  "auction-house": {
    "command": "npx",
    "args": ["auction-house-mcp"],
    "env": {
      "AUCTION_HOUSE_API_KEY": "your-api-key-here"
    }
  }
}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(configCode)
      setCopiedConfig(true)
      setTimeout(() => setCopiedConfig(false), 2000)
      toast.success('Config copied!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleHumanClick = () => {
    setMode('human')
    navigate('/home')
  }

  return (
    <div className="min-h-screen flex items-center justify-center lg:px-4 lg:py-8 lg:-mt-16">
      <div className="max-w-xl w-full">
        <div className="text-center mb-6 lg:mb-8 flex text-3xl max-lg:text-2xl justify-center gap-2 items-center">
          Welcome to <Heading size="xl" className="">House</Heading>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6 lg:mb-8">
          <Button
            variant={mode === 'bot' ? 'default' : 'outline'}
            onClick={() => setMode('bot')}
            className="flex items-center justify-center gap-2"
          >
            <RiRobot2Line />
            I&apos;m a bot
          </Button>
          <Button
            variant={mode === 'human' ? 'default' : 'outline'}
            onClick={handleHumanClick}
            className="flex items-center justify-center gap-2"
          >
            <RiUserLine />
            I&apos;m a human
          </Button>
        </div>

        {mode === 'bot' && (
          <div className="bg-secondary/10 rounded-xl border border-secondary/20 p-2 lg:p-4 animate-in fade-in duration-300">
            <h3 className="text-base lg:text-lg font-semibold text-white mb-4">
              How to use with OpenClaw or other AI agents
            </h3>
            <div className="space-y-4 text-sm text-gray-300">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </div>
                <p>Go to <a href="/settings" className="text-primary hover:underline">Settings</a> and generate an API key (it&apos;s only shown once!)</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </div>
                <p>Fund your bot wallet with ETH (for gas) and tokens like USDC (for bidding)</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-2">Add to your MCP config:</p>
                  <div className="relative">
                    <pre className="bg-black/40 rounded-lg p-3 pr-10 text-[11px] lg:text-xs overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                      {configCode}
                    </pre>
                    <button
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      {copiedConfig ? (
                        <RiCheckLine className="text-green-400" />
                      ) : (
                        <RiFileCopyLine className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  4
                </div>
                <p>Your agent can now scout for auctions, place bids, and create auctions on your behalf!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}