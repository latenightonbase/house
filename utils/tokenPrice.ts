/**
 * Utility function to fetch token price in USD from DexScreener API
 * @param contractAddress - The contract address of the token on Base network
 * @returns Promise<number> - The price in USD
 */
export const fetchTokenPrice = async (contractAddress: string): Promise<number> => {
  try {
    // Using DexScreener API for Base network token prices
    const apiUrl = `https://api.dexscreener.com/tokens/v1/base/${contractAddress}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const usableResponse = await response.json();
    
    // Check if we have valid data
    if (!usableResponse || !Array.isArray(usableResponse) || usableResponse.length === 0) {
      throw new Error('No price data available for this token');
    }

    const priceUsd = Number(usableResponse[0].priceUsd);
    
    if (isNaN(priceUsd)) {
      throw new Error('Invalid price data received');
    }

    return priceUsd;
  } catch (error) {
    console.error("Error fetching token price:", error);
    throw error;
  }
};

/**
 * Calculate USD value of a token amount
 * @param tokenAmount - Amount of tokens
 * @param pricePerToken - Price per token in USD
 * @returns The total USD value
 */
export const calculateUSDValue = (tokenAmount: number, pricePerToken: number): number => {
  return tokenAmount * pricePerToken;
};

/**
 * Format USD amount for display
 * @param amount - USD amount
 * @returns Formatted string
 */
export const formatUSDAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};