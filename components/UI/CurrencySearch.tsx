'use client'

import { useState, useEffect } from "react"
import Input from "../UI/Input"

interface CurrencyOption {
  name: string
  contractAddress: string
  symbol: string
}

interface CurrencySearchProps {
  onSelect: (currency: CurrencyOption) => void
  selectedCurrency: CurrencyOption | null
}

export default function CurrencySearch({ onSelect, selectedCurrency }: CurrencySearchProps) {
  const [contractAddress, setContractAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [contractTokenInfo, setContractTokenInfo] = useState<CurrencyOption | null>(null)
  const [contractError, setContractError] = useState('')

  // Resolve token info from contract address
  const resolveTokenFromContract = async (address: string) => {
    if (!address) {
      setContractError('')
      setContractTokenInfo(null)
      return
    }

    if (!address.startsWith('0x') || address.length !== 42) {
      setContractError('Invalid contract address format')
      setContractTokenInfo(null)
      return
    }

    setIsLoading(true)
    setContractError('')
    try {
      // TODO: Replace with actual contract call using wagmi/viem
      // For now, simulate the response
      const mockTokenInfo: CurrencyOption = {
        name: "Mock Token",
        symbol: "MOCK",
        contractAddress: address
      }
      setContractTokenInfo(mockTokenInfo)
    } catch (error) {
      console.error('Error resolving contract:', error)
      setContractError('Failed to resolve token information')
      setContractTokenInfo(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenSelect = (token: CurrencyOption) => {
    onSelect(token)
  }

  return (
    <div>
      <Input
        label="Contract Address"
        value={contractAddress}
        onChange={setContractAddress}
        placeholder="0x..."
      />
      
      {isLoading && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          Resolving token information...
        </div>
      )}

      {contractError && (
        <div className="mt-2 text-sm text-red-500">
          {contractError}
        </div>
      )}

      {contractTokenInfo && !contractError && (
        <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold text-primary">{contractTokenInfo.symbol}</div>
              <div className="text-sm text-foreground">{contractTokenInfo.name}</div>
            </div>
            <button
              type="button"
              onClick={() => handleTokenSelect(contractTokenInfo)}
              className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/90 transition-colors"
            >
              Select
            </button>
          </div>
        </div>
      )}
    </div>
  )
}