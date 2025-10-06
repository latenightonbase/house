'use client'

import { useState, useEffect } from "react"
import { readContractSetup } from '@/utils/contractSetup';
import { erc20Abi } from '@/utils/contracts/abis/erc20Abi';
import Input from "../UI/Input"
import { twMerge } from 'tailwind-merge'

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
  const [contractAddress, setContractAddress] = useState('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
  const [isLoading, setIsLoading] = useState(false)
  const [contractTokenInfo, setContractTokenInfo] = useState<CurrencyOption | null>(null)
  const [contractError, setContractError] = useState('')

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
      // Fetch token name and symbol from the contract
      const contract = await readContractSetup(address, erc20Abi);
      if (!contract) {
        throw new Error('Failed to initialize contract. Please check the address and ABI.');
      }

      const [name, symbol] = await Promise.all([
        await contract.name(),
        await contract.symbol()
      ]);

      // Validate that we got valid responses
      if (!name || !symbol) {
        throw new Error('Invalid token contract - missing name or symbol')
      }

      const tokenInfo: CurrencyOption = {
        name: name as string,
        symbol: symbol as string,
        contractAddress: address
      }
      
      setContractTokenInfo(tokenInfo)

      if (tokenInfo) {
        onSelect(tokenInfo); // Automatically select the token once resolved
      }
    } catch (error: any) {
      console.error('Error resolving contract:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to resolve token information.'
      
      if (error?.message?.includes('execution reverted')) {
        errorMessage = 'Contract execution failed. This might not be a valid ERC20 token.'
      } else if (error?.message?.includes('call')) {
        errorMessage = 'Unable to call contract. Please check the address and try again.'
      } else if (error?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else {
        errorMessage = 'Failed to resolve token information. Please verify this is a valid ERC20 contract address.'
      }
      
      setContractError(errorMessage)
      setContractTokenInfo(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      resolveTokenFromContract(contractAddress)
    }, 500) // Debounce the API call

    return () => clearTimeout(timeoutId)
  }, [contractAddress])

  return (
    <div>
      <Input
        label="Token to use (Default: USDC)"
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
        <div
          className={twMerge(
            "mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20",
            selectedCurrency?.contractAddress === contractTokenInfo.contractAddress ? "border-green-500" : "opacity-70"
          )}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold text-primary">{contractTokenInfo.symbol}</div>
              <div className="text-sm text-foreground">{contractTokenInfo.name}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}