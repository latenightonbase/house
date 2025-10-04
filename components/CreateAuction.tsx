'use client'

import { useState } from "react"
import Input from "./UI/Input"
import CurrencySearch from "./UI/CurrencySearch"
import DateTimePicker from "./UI/DateTimePicker"

interface CurrencyOption {
  name: string
  contractAddress: string
  symbol: string
}

type CurrencySelectionMode = 'search' | 'contract'

export default function CreateAuction(){
    const [auctionTitle, setAuctionTitle] = useState('')
    const [currencyMode, setCurrencyMode] = useState<CurrencySelectionMode>('search')
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption | null>(null)
    const [endTime, setEndTime] = useState<Date | null>(null)
    const [minBidAmount, setMinBidAmount] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!auctionTitle || !selectedCurrency || !endTime || !minBidAmount || parseFloat(minBidAmount) <= 0) {
            alert('Please fill in all required fields with valid values')
            return
        }

        setIsLoading(true)
        try {
            // TODO: Implement actual auction creation logic
            console.log({
                auctionTitle,
                currency: selectedCurrency,
                endTime: endTime.toISOString(),
                minBidAmount: parseFloat(minBidAmount)
            })
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            alert('Auction created successfully!')
            
            // Reset form
            setAuctionTitle('')
            setSelectedCurrency(null)
            setEndTime(null)
            setMinBidAmount('')
        } catch (error) {
            console.error('Error creating auction:', error)
            alert('Failed to create auction. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCurrencySelect = (currency: CurrencyOption) => {
        setSelectedCurrency(currency)
    }

    const handleCurrencyModeChange = (mode: CurrencySelectionMode) => {
        setCurrencyMode(mode)
        setSelectedCurrency(null) // Reset selection when changing modes
    }

    const isFormValid = auctionTitle.trim() && selectedCurrency && endTime && minBidAmount.trim() && parseFloat(minBidAmount) > 0

    return(
        <div className="max-w-2xl mx-auto">
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {/* Auction Title */}
                <Input
                    label="Auction Title"
                    value={auctionTitle}
                    onChange={setAuctionTitle}
                    placeholder="Enter a descriptive title for your auction"
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

                {/* Selected Currency Display */}
                {selectedCurrency && (
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-primary text-lg">Selected Currency</h3>
                                <p className="text-foreground font-medium">{selectedCurrency.symbol} - {selectedCurrency.name}</p>
                                <p className="text-sm text-gray-600 font-mono mt-1">
                                    {selectedCurrency.contractAddress}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedCurrency(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Remove selection"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Minimum Bid Amount */}
                <Input
                    label="Minimum Bid Amount"
                    value={minBidAmount}
                    onChange={setMinBidAmount}
                    placeholder="Enter the minimum bid amount"
                    type="number"
                    required
                />

                {/* End Time Picker */}
                <DateTimePicker
                    label="Auction End Time"
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
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className="w-full py-4 px-6 bg-primary text-white rounded-lg font-semibold text-lg transition-all hover:bg-primary/90 disabled:bg-disabled disabled:cursor-not-allowed disabled:text-gray-500 shadow-lg hover:shadow-xl"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating Auction...
                        </div>
                    ) : (
                        'Create Auction'
                    )}
                </button>

                {/* Form Validation Helper */}
                {!isFormValid && (
                    <div className="text-sm text-gray-500 text-center">
                        Please fill in all required fields to create your auction
                    </div>
                )}
            </form>
        </div>
    )
}