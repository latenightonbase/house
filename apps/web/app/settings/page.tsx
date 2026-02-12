'use client'

import { useState, useEffect } from 'react'
import { usePrivy, getAccessToken } from '@privy-io/react-auth'
import { useGlobalContext } from '@/utils/providers/globalContext'
import Heading from '@/components/UI/Heading'
import { Button } from '@/components/UI/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/UI/Dialog'
import Input from '@/components/UI/Input'
import toast from 'react-hot-toast'
import {
  RiLoader5Fill,
  RiKeyLine,
  RiWallet3Line,
  RiFileCopyLine,
  RiExternalLinkLine,
  RiDeleteBinLine,
  RiAddLine,
  RiRobot2Line,
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
} from 'react-icons/ri'

interface ApiKeyData {
  id: string
  keyPrefix: string
  name: string
  active: boolean
  lastUsedAt: string | null
  createdAt: string
  walletAddress: string | null
}

interface NewKeyData {
  apiKey: string
  keyPrefix: string
  walletAddress: string
  keyId: string
}

export default function SettingsPage() {
  const { authenticated } = usePrivy()
  const { user } = useGlobalContext()
  const [loading, setLoading] = useState(true)
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [generating, setGenerating] = useState(false)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [newKeyData, setNewKeyData] = useState<NewKeyData | null>(null)
  const [keyName, setKeyName] = useState('My Bot')
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedWallet, setCopiedWallet] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  // Fetch existing API keys
  const fetchApiKeys = async () => {
    try {
      const accessToken = await getAccessToken()
      const response = await fetch('/api/protected/api-keys', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const data = await response.json()
      if (data.keys) {
        setApiKeys(data.keys)
      }
    } catch (error) {
      console.error('Error fetching API keys:', error)
      toast.error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authenticated) {
      fetchApiKeys()
    }
  }, [authenticated])

  // Generate new API key
  const handleGenerateKey = async () => {
    setGenerating(true)
    try {
      const accessToken = await getAccessToken()
      const response = await fetch('/api/protected/api-keys/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: keyName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate API key')
      }

      setNewKeyData({
        apiKey: data.apiKey,
        keyPrefix: data.keyPrefix,
        walletAddress: data.walletAddress,
        keyId: data.keyId,
      })

      setShowGenerateDialog(false)
      setShowNewKeyDialog(true)
      setKeyName('My Bot')
      
      // Refresh the list
      fetchApiKeys()
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate API key')
    } finally {
      setGenerating(false)
    }
  }

  // Revoke API key
  const handleRevokeKey = async (keyId: string) => {
    setRevoking(keyId)
    try {
      const accessToken = await getAccessToken()
      const response = await fetch('/api/protected/api-keys', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyId }),
      })

      if (!response.ok) {
        throw new Error('Failed to revoke API key')
      }

      toast.success('API key revoked')
      fetchApiKeys()
    } catch (error) {
      toast.error('Failed to revoke API key')
    } finally {
      setRevoking(null)
    }
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: 'key' | 'wallet') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'key') {
        setCopiedKey(true)
        setTimeout(() => setCopiedKey(false), 2000)
      } else {
        setCopiedWallet(true)
        setTimeout(() => setCopiedWallet(false), 2000)
      }
      toast.success(`${type === 'key' ? 'API Key' : 'Wallet address'} copied!`)
    } catch {
      toast.error('Failed to copy')
    }
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heading size="md" gradient={false} className="text-white mb-4">
            Access Denied
          </Heading>
          <p className="text-caption">Please login to access settings.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RiLoader5Fill className="text-primary animate-spin text-4xl mb-4 mx-auto" />
          <p className="text-caption">Loading settings...</p>
        </div>
      </div>
    )
  }

  const activeKey = apiKeys.find((k) => k.active)
  const botWalletAddress = activeKey?.walletAddress

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto pt-4 lg:pt-6 max-lg:pb-20 px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-primary/30 lg:p-8 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <RiRobot2Line className="text-3xl text-white" />
            </div>
            <div>
              <Heading size="lg" gradient={true}>
                Bot Settings
              </Heading>
              <p className="text-gray-400 mt-1">
                Manage API keys for your AI agents to interact with House
              </p>
            </div>
          </div>

          {/* Bot Wallet Card */}
          {botWalletAddress && (
            <div className="bg-black/30 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <RiWallet3Line className="text-xl text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Your Bot Wallet</p>
                    <p className="text-white font-mono text-sm">
                      {botWalletAddress.slice(0, 10)}...{botWalletAddress.slice(-8)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(botWalletAddress, 'wallet')}
                    className="px-3 py-2 bg-white/10 rounded-lg text-sm text-white hover:bg-white/20 transition-colors flex items-center gap-2"
                  >
                    {copiedWallet ? (
                      <RiCheckLine className="text-green-400" />
                    ) : (
                      <RiFileCopyLine />
                    )}
                    Copy
                  </button>
                  <a
                    href={`https://basescan.org/address/${botWalletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-white/10 rounded-lg text-sm text-white hover:bg-white/20 transition-colors flex items-center gap-2"
                  >
                    <RiExternalLinkLine />
                    Basescan
                  </a>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Fund this wallet with ETH (for gas) and tokens (USDC, etc.) to let your bot create auctions and place bids.
              </p>
            </div>
          )}
        </div>

        {/* API Keys Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">API Keys</h2>
            <Button
              onClick={() => setShowGenerateDialog(true)}
              className="flex items-center gap-2"
            >
              <RiAddLine />
              Generate New Key
            </Button>
          </div>

          {apiKeys.length === 0 ? (
            <div className="bg-white/10 rounded-xl border border-white/10 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
                <RiKeyLine className="text-3xl text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No API Keys</h3>
              <p className="text-gray-400 mb-4">
                Generate an API key to let your AI agents interact with House
              </p>
              <Button onClick={() => setShowGenerateDialog(true)}>
                Generate Your First Key
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`bg-white/10 rounded-xl p-4 border transition-colors ${
                    key.active
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-white/10 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          key.active ? 'bg-green-500/20' : 'bg-gray-500/20'
                        }`}
                      >
                        <RiKeyLine
                          className={`text-xl ${
                            key.active ? 'text-green-400' : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold">{key.name}</p>
                          {key.active ? (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                              Revoked
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 font-mono">
                          {key.keyPrefix}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-gray-400">Last used</p>
                        <p className="text-white">{formatDate(key.lastUsedAt)}</p>
                      </div>
                      {key.active && (
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          disabled={revoking === key.id}
                          className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {revoking === key.id ? (
                            <RiLoader5Fill className="animate-spin" />
                          ) : (
                            <RiDeleteBinLine />
                          )}
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>

                  {key.walletAddress && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-gray-500">
                        Bot Wallet:{' '}
                        <span className="font-mono text-gray-400">
                          {key.walletAddress}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-secondary/10 rounded-xl border border-secondary/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            How to use with OpenClaw or other AI agents
          </h3>
          <div className="space-y-4 text-sm text-gray-300">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                1
              </div>
              <p>Generate an API key above and copy it (it&apos;s only shown once!)</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                2
              </div>
              <p>
                Fund your bot wallet with ETH (for gas) and tokens like USDC (for bidding)
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              <div>
                <p className="mb-2">Add to your MCP config:</p>
                <pre className="bg-black/40 rounded-lg p-3 text-xs overflow-x-auto">
{`{
  "auction-house": {
    "command": "npx",
    "args": ["auction-house-mcp"],
    "env": {
      "AUCTION_HOUSE_API_KEY": "your-api-key-here"
    }
  }
}`}
                </pre>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                4
              </div>
              <p>
                Your agent can now scout for auctions, place bids, and create auctions on your behalf!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Key Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Generate API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for your AI agent. A dedicated wallet will be created automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              label="Key Name"
              value={keyName}
              onChange={setKeyName}
              placeholder="e.g. My OpenClaw Bot"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGenerateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateKey} disabled={generating || !keyName.trim()}>
              {generating ? (
                <>
                  <RiLoader5Fill className="animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Created Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <RiCheckLine className="text-green-400" />
              API Key Created!
            </DialogTitle>
            <DialogDescription>
              Copy your API key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>

          {newKeyData && (
            <div className="py-4 space-y-4">
              {/* API Key */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">API Key</label>
                <div className="bg-black/40 rounded-lg p-3 flex items-center justify-between gap-2">
                  <code className="text-green-400 text-sm break-all">
                    {showKey ? newKeyData.apiKey : '•'.repeat(40)}
                  </code>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {showKey ? (
                        <RiEyeOffLine className="text-gray-400" />
                      ) : (
                        <RiEyeLine className="text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(newKeyData.apiKey, 'key')}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {copiedKey ? (
                        <RiCheckLine className="text-green-400" />
                      ) : (
                        <RiFileCopyLine className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bot Wallet */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">Bot Wallet Address</label>
                <div className="bg-black/40 rounded-lg p-3 flex items-center justify-between gap-2">
                  <code className="text-blue-400 text-sm break-all">
                    {newKeyData.walletAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKeyData.walletAddress, 'wallet')}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                  >
                    {copiedWallet ? (
                      <RiCheckLine className="text-green-400" />
                    ) : (
                      <RiFileCopyLine className="text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Send ETH and tokens to this address to fund your bot
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowNewKeyDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
