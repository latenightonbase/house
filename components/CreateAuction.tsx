'use client'

import { useState } from "react"
import { writeContract } from '@wagmi/core'
import { useAccount } from 'wagmi'
import { config } from '@/utils/providers/rainbow'
import { auctionAbi } from '@/utils/contracts/abis/auctionAbi'
import {contractAdds} from '@/utils/contracts/contractAdds'
import Input from "./UI/Input"
import CurrencySearch from "./UI/CurrencySearch"
import DateTimePicker from "./UI/DateTimePicker"
import { writeContractSetup } from "@/utils/contractSetup"

interface CurrencyOption {
  name: string
  contractAddress: string
  symbol: string
}

type CurrencySelectionMode = 'search' | 'contract'

export default function CreateAuction(){
    const { address, isConnected } = useAccount()
    const [auctionTitle, setAuctionTitle] = useState('')
    // const [currencyMode, setCurrencyMode] = useState<CurrencySelectionMode>('search')
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption | null>(null)
    const [endTime, setEndTime] = useState<Date | null>(null)
    const [minBidAmount, setMinBidAmount] = useState('0') // Made the minimum bid amount optional and default to 0
    const [isLoading, setIsLoading] = useState(false)

    // Helper function to calculate duration in hours
    const calculateDurationHours = (endDate: Date): number => {
        const now = new Date()
        const diffMs = endDate.getTime() - now.getTime()
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60)) // Round up to ensure auction doesn't end early
        return Math.max(1, diffHours) // Minimum 1 hour
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Validation
        if (!auctionTitle || !selectedCurrency || !endTime) {
            alert('Please fill in all required fields with valid values')
            return
        }

        if (!isConnected || !address) {
            alert('Please connect your wallet to create an auction')
            return
        }

        // Ensure auction ends in the future
        const now = new Date()
        if (endTime <= now) {
            alert('Auction end time must be in the future')
            return
        }

        setIsLoading(true)
        try {
            const durationHours = calculateDurationHours(endTime)
            const minBidAmountWei = parseFloat(minBidAmount || '0') * Math.pow(10, 18) // Convert to wei (assuming 18 decimals)

            console.log('Creating auction with params:', {
                token: selectedCurrency.contractAddress,
                tokenName: auctionTitle,
                durationHours,
                minBidAmount: minBidAmountWei.toString()
            })

            const contract = await writeContractSetup(contractAdds.auctions, auctionAbi);

            // Call the smart contract
            const txHash = await contract?.startAuction(
                    selectedCurrency.contractAddress as `0x${string}`,
                    auctionTitle,
                    BigInt(durationHours),
                    BigInt(Math.floor(minBidAmountWei))
            )

            await txHash?.wait()

            console.log('Transaction hash:', txHash)

            // Call the API to save auction details in the database
            const response = await fetch('/api/auctions/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    auctionName: auctionTitle,
                    blockchainAuctionId: txHash.blockchainAuctionId,
                    tokenAddress: selectedCurrency.contractAddress,
                    endDate: endTime,
                    startDate: now,
                    hostedBy: address,
                    minimumBid: parseFloat(minBidAmount),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save auction details in the database');
            }

            //start here
            
            // Reset form
            setAuctionTitle('')
            setSelectedCurrency(null)
            setEndTime(null)
            setMinBidAmount('0')
        } catch (error: any) {
            console.error('Error creating auction:', error)
            
            // Handle different types of errors
            let errorMessage = 'Failed to create auction. Please try again.'
            
            if (error?.message?.includes('user rejected')) {
                errorMessage = 'Transaction was cancelled by user.'
            } else if (error?.message?.includes('insufficient funds')) {
                errorMessage = 'Insufficient funds to complete the transaction.'
            } else if (error?.message?.includes('Max 3 active auctions')) {
                errorMessage = 'You can only have 3 active auctions at a time.'
            } else if (error?.message?.includes('Minimum bid must be greater than 0')) {
                errorMessage = 'Minimum bid amount must be greater than 0.'
            } else if (error?.shortMessage) {
                errorMessage = error.shortMessage
            } else if (error?.message) {
                errorMessage = error.message
            }
            
            alert(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCurrencySelect = (currency: CurrencyOption) => {
        setSelectedCurrency(currency)
    }

    const handleCurrencyModeChange = (mode: CurrencySelectionMode) => {
        // setCurrencyMode(mode)
        setSelectedCurrency(null) // Reset selection when changing modes
    }

    const isFormValid = isConnected && auctionTitle.trim() && selectedCurrency && endTime && minBidAmount.trim() && parseFloat(minBidAmount) > 0

    return(
        <div className="max-w-2xl mx-auto">
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {/* Auction Title */}
                <Input
                    label="Auction Title"
                    value={auctionTitle}
                    onChange={setAuctionTitle}
                    placeholder="Enter a title for your auction"
                    required
                />

                {/* Currency Selection Mode */}
                <div>
                    {/*<label className="block text-sm font-medium text-foreground mb-3">
                        How would you like to specify the currency? *
                    </label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => handleCurrencyModeChange('search')}
                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                                currencyMode === 'search'
                                    ? 'border-primary text-primary bg-primary/10'
                                    : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            🔍 Search Coin
                            <div className="text-xs mt-1 opacity-75">Search popular tokens</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCurrencyModeChange('contract')}
                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                                currencyMode === 'contract'
                                    ? 'border-primary text-primary bg-primary/10'
                                    : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            📝 Contract Address
                            <div className="text-xs mt-1 opacity-75">Enter token address</div>
                        </button>
                    </div>*/}
                </div>

                {/* Currency Search/Input */}
                <CurrencySearch
                    // mode={currencyMode}
                    onSelect={handleCurrencySelect}
                    selectedCurrency={selectedCurrency}
                />


                {/* Minimum Bid Amount */}
                <Input
                    label="Minimum Bid Amount (Optional)"
                    value={minBidAmount}
                    onChange={setMinBidAmount}
                    placeholder="Enter the minimum bid amount (default: 0)"
                    type="number"
                />

                {/* End Time Picker */}
                <DateTimePicker
                    label="Auction End Time (Local Time)"
                    value={endTime}
                    onChange={setEndTime}
                    placeholder=""
                    required
                    minDate={new Date()} // Prevent selecting past dates
                />

                {/* Time Remaining Display */}
                {endTime && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-700">
                            <strong>Auction Duration:</strong> {' '}
                            {(() => {
                                const now = new Date()
                                const diff = endTime.getTime() - now.getTime()
                                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                                
                                if (diff <= 0) return "Invalid time (must be in the future)"
                                
                                const parts = []
                                if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`)
                                if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`)
                                if (minutes > 0 && days === 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`)
                                
                                return parts.join(', ')
                            })()}
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit" // This ensures the form submission triggers handleSubmit
                    disabled={!isFormValid || isLoading}
                    className="w-full py-4 px-6 bg-primary text-white rounded-lg font-semibold text-lg transition-all hover:bg-primary/90 disabled:bg-disabled disabled:cursor-not-allowed disabled:text-gray-500 shadow-lg hover:shadow-xl"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating Auction...
                        </div>
                    ) : !isConnected ? (
                        'Connect Wallet to Create Auction'
                    ) : (
                        'Create Auction'
                    )}
                </button>

                {/* Form Validation Helper */}
                {!isConnected && (
                    <div className="text-sm text-red-500 text-center">
                        Please connect your wallet to create an auction
                    </div>
                )}
                {isConnected && !isFormValid && (
                    <div className="text-sm text-gray-500 text-center">
                        Please fill in all required fields to create your auction
                    </div>
                )}
            </form>
        </div>
    )
}