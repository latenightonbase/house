import { erc20Abi } from "@/utils/contracts/abis/erc20Abi";
import lnobAbi from "@/utils/contracts/abis/lnobAbi";
import { ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const TARGET_TOKEN = "0x8c32bcfc720fec35443748a96030ce866d0665ff";
const ZERO_X_API_KEY = process.env.ZERO_X_API_KEY;
const BASE_CHAIN_ID = "8453";

const FALLBACK_ADDRESS="0x1ce256752fBa067675F09291d12A1f069f34f5e8"

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    
    try{
        const body = await req.json();
        const { token } = body;
        console.log('Request payload:', { token });

        // Validate required environment variables
        console.log('Validating environment variables...');
        if (!process.env.PRIVATE_KEY) {
            console.error('❌ PRIVATE_KEY not configured');
            return NextResponse.json({ success: false, message: 'PRIVATE_KEY not configured' }, { status: 500 });
        }

        if (!ZERO_X_API_KEY) {
            console.error('❌ ZERO_X_API_KEY not configured');
            return NextResponse.json({ success: false, message: 'ZERO_X_API_KEY not configured' }, { status: 500 });
        }

        if (!process.env.BILL_WALLET || !process.env.RISAV_WALLET ||
            !process.env.STAKING_CONTRACT || !FALLBACK_ADDRESS) {
            console.error('❌ Required wallet addresses not configured');
            console.error('Missing wallets:', {
                BILL_WALLET: !!process.env.BILL_WALLET,
                RISAV_WALLET: !!process.env.RISAV_WALLET,
                STAKING_CONTRACT: !!process.env.STAKING_CONTRACT,
                FALLBACK_ADDRESS: !!FALLBACK_ADDRESS
            });
            return NextResponse.json({ success: false, message: 'Required wallet addresses not configured' }, { status: 500 });
        }
        console.log('✅ All environment variables validated');

        // Create provider with skipFetchSetup to avoid network detection issues
        console.log('Setting up blockchain provider...');
        const provider = new ethers.providers.JsonRpcProvider({
            url: "https://base-mainnet.g.alchemy.com/v2/CA4eh0FjTxMenSW3QxTpJ7D-vWMSHVjq",
            skipFetchSetup: true
        });
        
        // Set network manually to avoid detection
        (provider as any)._network = {
            name: "base",
            chainId: 8453
        };
        
        // console.log('✅ Provider setup complete');

        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

        console.log('🔄 Initiating token swap process...');
        console.log('Token to swap:', token);
        console.log('Wallet address:', wallet.address);

        let totalUSDC;
        let swapTxHash = null;

        // Check if token is already USDC - if so, skip the initial swap
        if (token.toLowerCase() === USDC_BASE.toLowerCase()) {
            console.log('ℹ️ Token is already USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913), skipping initial swap...');
            console.log('✅ Proceeding directly to USDC distribution');
            
            // Get USDC balance directly
            const usdcContract = new ethers.Contract(
                USDC_BASE,
                ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
                provider
            );
            
            const usdcBalance = await usdcContract.balanceOf(wallet.address);
            console.log('✅ USDC balance retrieved:', usdcBalance.toString());
            console.log('✅ USDC balance (human readable):', ethers.utils.formatUnits(usdcBalance, 6), 'USDC');
            
            if (usdcBalance.isZero()) {
                console.error('❌ No USDC to distribute - balance is zero');
                return NextResponse.json({ success: false, message: 'No USDC to distribute' }, { status: 400 });
            }
            
            totalUSDC = usdcBalance;
        } else {
            // Original swap logic for non-USDC tokens

            // Original swap logic for non-USDC tokens
            // // Get token balance
            console.log('📊 Checking token balance...');
            const tokenContract = new ethers.Contract(
                token,
                ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
                provider
            );

            console.log('Fetching balance for token:', token, 'wallet:', wallet.address);
            
            let balance;
            try {
                balance = await tokenContract.balanceOf(wallet.address);
                console.log('✅ Token balance retrieved:', balance.toString());
                
                if (balance.isZero()) {
                    console.error('❌ No tokens to sell - balance is zero');
                    return NextResponse.json({ success: false, message: 'No tokens to sell' }, { status: 400 });
                }
            } catch (balanceError) {
                console.error('❌ Failed to get token balance:', balanceError);
                return NextResponse.json({ success: false, message: 'Failed to get token balance' }, { status: 500 });
            }

            // // Get price quote
            // console.log('💰 Getting price quote from 0x API...');
            const priceParams = new URLSearchParams({
                chainId: BASE_CHAIN_ID,
                sellToken: token,
                buyToken: USDC_BASE,
                sellAmount: balance.toString(),
                taker: wallet.address,
                slippagePercentage: '0.5', // 0.5% slippage protection
                gasless: 'false', // Optimize for lower gas
                intentOnFilling: 'true', // Signal intent for better routing
                enableSlippageProtection: 'true', // Enable slippage protection
            });

            const priceResponse = await fetch(
                `https://api.0x.org/swap/allowance-holder/price?${priceParams.toString()}`,
                {
                    headers: {
                        '0x-api-key': ZERO_X_API_KEY!,
                        '0x-version': 'v2',
                    },
                }
            );

            const priceData = await priceResponse.json();

            // console.log('✅ Price data received:', {
            //     buyAmount: priceData.buyAmount,
            //     sellAmount: priceData.sellAmount,
            //     price: priceData.price,
            //     gasPrice: priceData.gasPrice
            // });

            // // Check if allowance is needed
            if (priceData.issues?.allowance) {
                console.log('🔐 Approving token allowance...');
                const tokenContract = new ethers.Contract(
                    token,
                    ['function approve(address spender, uint256 amount) external returns (bool)'],
                    wallet
                );

                const approveTx = await tokenContract.approve(
                    priceData.issues.allowance.spender,
                    ethers.constants.MaxUint256
                );
                await approveTx.wait();
                console.log('✅ Token allowance approved for spender:', priceData.issues.allowance.spender);
            } else {
                console.log('ℹ️ No token allowance needed');
            }

            // // Get firm quote
            // console.log('📋 Getting firm quote from 0x API...');
            const quoteResponse = await fetch(
                `https://api.0x.org/swap/allowance-holder/quote?${priceParams.toString()}`,
                {
                    headers: {
                        '0x-api-key': ZERO_X_API_KEY!,
                        '0x-version': 'v2',
                    },
                }
            );

            const quoteData = await quoteResponse.json();

            // console.log('✅ Quote data received:', {
            //     buyAmount: quoteData.buyAmount,
            //     gas: quoteData.transaction.gas,
            //     to: quoteData.transaction.to
            // });

            // // Execute swap
            // console.log('🔄 Executing token to USDC swap...');
            
            // Get current gas price and set a reasonable gas limit
            const currentGasPrice = await provider.getGasPrice();
            console.log('Current network gas price:', ethers.utils.formatUnits(currentGasPrice, 'gwei'), 'gwei');
            
            // Use a more conservative gas price multiplier based on current conditions
            const gasPriceGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));
            const multiplier = gasPriceGwei > 20 ? 105 : 110; // Lower multiplier if gas is already high
            const swapOptimizedGasPrice = currentGasPrice.mul(multiplier).div(100);
            
            console.log('Optimized gas price:', ethers.utils.formatUnits(swapOptimizedGasPrice, 'gwei'), 'gwei');
            
            // Estimate gas limit with buffer
            const swapEstimatedGas = quoteData.transaction.gas ? 
                ethers.BigNumber.from(quoteData.transaction.gas).mul(120).div(100) : // 20% buffer
                ethers.BigNumber.from("250000"); // fallback gas limit for token swaps
            
            const swapTx = await wallet.sendTransaction({
                to: quoteData.transaction.to,
                data: quoteData.transaction.data,
                value: quoteData.transaction.value ? ethers.BigNumber.from(quoteData.transaction.value) : undefined,
                gasLimit: swapEstimatedGas,
                gasPrice: swapOptimizedGasPrice,
            });

            const receipt = await swapTx.wait();
            console.log('✅ Swap completed successfully!');
            console.log('Transaction hash:', receipt.transactionHash);
            console.log('Gas used:', receipt.gasUsed.toString());
            console.log('Gas price used:', swapOptimizedGasPrice.toString());
            console.log('Total gas cost (ETH):', ethers.utils.formatEther(receipt.gasUsed.mul(swapOptimizedGasPrice)));
            
            totalUSDC = ethers.BigNumber.from(quoteData.buyAmount);
            swapTxHash = receipt.transactionHash;
        }

        // // Calculate distribution amounts (3:3:2 ratio)
        // console.log('📊 Calculating distribution amounts (3:3:2 ratio)...');
        const firstThree = totalUSDC.mul(3).div(8);  // 3/8 of total
        const secondThree = totalUSDC.mul(3).div(8); // 3/8 of total
        const lastTwo = totalUSDC.sub(firstThree).sub(secondThree); // remainder

        // console.log('✅ Distribution calculated:', {
        //     total: totalUSDC.toString(),
        //     firstThree: firstThree.toString(),
        //     secondThree: secondThree.toString(),
        //     lastTwo: lastTwo.toString(),
        //     percentages: '37.5% | 37.5% | 25%'
        // });

        // // USDC contract for transfers
        // console.log('🏦 Setting up USDC contract...');
        const usdcContract = new ethers.Contract(
            USDC_BASE,
            ['function transfer(address to, uint256 amount) external returns (bool)', 'function balanceOf(address) view returns (uint256)'],
            wallet
        );

        // // Check actual USDC balance
        const actualUSDCBalance = await usdcContract.balanceOf(wallet.address);
        // console.log('✅ Actual USDC balance in wallet:', actualUSDCBalance.toString());
        
        if (actualUSDCBalance.lt(totalUSDC)) {
            console.warn('⚠️ Warning: Actual balance is less than expected USDC amount');
        }

        // // PART 1: Distribute first 3 parts in 1:2 ratio
        // console.log('💰 PART 1: Distributing first 3 parts (1:2 ratio)...');
        const billAmount = firstThree.div(3); // 1/3 of first part
        const devAmount = firstThree.sub(billAmount); // 2/3 of first part

        // console.log('Distribution breakdown:', {
        //     billAmount: billAmount.toString(),
        //     totalDevAmount: devAmount.toString(),
        //     recipient: 'BILL_WALLET + RISAV_WALLET'
        // });

        // // Send to BILL_WALLET
        // console.log('💸 Sending to BILL_WALLET...');
        const billTx = await usdcContract.transfer(process.env.BILL_WALLET || FALLBACK_ADDRESS, billAmount);
        await billTx.wait();
        console.log('✅ Sent to BILL_WALLET:', billAmount.toString(), 'Hash:', billTx.hash);

        // Send entire dev amount to RISAV_WALLET only
        console.log('💸 Sending dev amount to RISAV_WALLET...');
        const risavTx = await usdcContract.transfer(process.env.RISAV_WALLET || FALLBACK_ADDRESS, devAmount);
        await risavTx.wait();
        console.log('✅ Sent to RISAV_WALLET:', devAmount.toString(), 'Hash:', risavTx.hash);

        const tokenBuyParams = new URLSearchParams({
            chainId: BASE_CHAIN_ID,
            sellToken: USDC_BASE,
            buyToken: TARGET_TOKEN,
            sellAmount: secondThree.toString(),
            taker: wallet.address,
            slippagePercentage: '0.5', // 0.5% slippage protection
            gasless: 'false', // Optimize for lower gas
            intentOnFilling: 'true', // Signal intent for better routing
            enableSlippageProtection: 'true', // Enable slippage protection
        });

        const tokenPriceResponse = await fetch(
            `https://api.0x.org/swap/allowance-holder/price?${tokenBuyParams.toString()}`,
            {
                headers: {
                    '0x-api-key': ZERO_X_API_KEY!,
                    '0x-version': 'v2',
                },
            }
        );

        const tokenPriceData = await tokenPriceResponse.json();
        // console.log('✅ Token buy price data received:', {
        //     buyAmount: tokenPriceData.buyAmount,
        //     sellAmount: tokenPriceData.sellAmount,
        //     price: tokenPriceData.price
        // });

        // // Check if allowance is needed for USDC
        if (tokenPriceData.issues?.allowance) {
            console.log('🔐 Approving USDC allowance for token purchase...');
            const usdcApproveContract = new ethers.Contract(
                USDC_BASE,
                ['function approve(address spender, uint256 amount) external returns (bool)'],
                wallet
            );

            const usdcApproveTx = await usdcApproveContract.approve(
                tokenPriceData.issues.allowance.spender,
                ethers.constants.MaxUint256
            );
            await usdcApproveTx.wait();
            console.log('✅ USDC allowance granted for spender:', tokenPriceData.issues.allowance.spender);
        } else {
            console.log('ℹ️ No USDC allowance needed for token purchase');
        }

        // // Get firm quote for token purchase
        // console.log('📋 Getting firm quote for token purchase...');
        const tokenQuoteResponse = await fetch(
            `https://api.0x.org/swap/allowance-holder/quote?${tokenBuyParams.toString()}`,
            {
                headers: {
                    '0x-api-key': ZERO_X_API_KEY!,
                    '0x-version': 'v2',
                },
            }
        );

        const tokenQuoteData = await tokenQuoteResponse.json();
        
        // Get current gas price and set a reasonable gas limit
        const tokenSwapGasPrice = await provider.getGasPrice();
        console.log('Current network gas price for token swap:', ethers.utils.formatUnits(tokenSwapGasPrice, 'gwei'), 'gwei');
        
        // Use a more conservative gas price multiplier based on current conditions
        const tokenGasPriceGwei = parseFloat(ethers.utils.formatUnits(tokenSwapGasPrice, 'gwei'));
        const tokenMultiplier = tokenGasPriceGwei > 20 ? 105 : 110; // Lower multiplier if gas is already high
        const tokenOptimizedGasPrice = tokenSwapGasPrice.mul(tokenMultiplier).div(100);
        
        console.log('Optimized token swap gas price:', ethers.utils.formatUnits(tokenOptimizedGasPrice, 'gwei'), 'gwei');
        
        // Estimate gas limit (0x API provides estimate, but we can optimize)
        const tokenEstimatedGas = tokenQuoteData.transaction.gas ? 
            ethers.BigNumber.from(tokenQuoteData.transaction.gas).mul(120).div(100) : // 20% buffer
            ethers.BigNumber.from("200000"); // fallback gas limit
        
        const tokenBuyTx = await wallet.sendTransaction({
            to: tokenQuoteData.transaction.to,
            data: tokenQuoteData.transaction.data,
            value: tokenQuoteData.transaction.value ? ethers.BigNumber.from(tokenQuoteData.transaction.value) : undefined,
            gasLimit: tokenEstimatedGas,
            gasPrice: tokenOptimizedGasPrice,
        });

        const tokenBuyReceipt = await tokenBuyTx.wait();
        console.log('✅ Token purchase completed successfully!');
        console.log('Transaction hash:', tokenBuyReceipt.transactionHash);
        console.log('Gas used:', tokenBuyReceipt.gasUsed.toString());
        console.log('Gas price used:', tokenOptimizedGasPrice.toString());
        console.log('Total gas cost (ETH):', ethers.utils.formatEther(tokenBuyReceipt.gasUsed.mul(tokenOptimizedGasPrice)));

        // // Burn the purchased tokens
        // console.log('🔥 Starting token burn process...');

        const targetTokenContract = new ethers.Contract(
            TARGET_TOKEN,
            lnobAbi,
            wallet
        );

        const tokenBalance = await targetTokenContract.balanceOf(wallet.address);

        //add a 2s delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Token balance available for burning:', tokenBalance.toString());

        if (!tokenBalance.isZero()) {
            console.log('🔥 Burning tokens by sending to zero address...');
            // Burn by sending to zero address
            const burnTx = await targetTokenContract.burn(tokenBalance);
            await burnTx.wait();
            console.log('✅ Tokens burned successfully!');
            console.log('Burned amount:', tokenBalance.toString());
            console.log('Burn transaction hash:', burnTx.hash);
        } else {
            console.log('⚠️ No tokens to burn - balance is zero');
        }

        console.log('✅ PART 2 completed - Token purchase and burn process finished');

        // PART 3: Send last 2 parts to staking contract
        console.log('🏦 PART 3: Sending final portion to staking contract...');
        console.log('Amount to send:', lastTwo.toString());
        console.log('Staking contract address:', process.env.STAKING_CONTRACT || FALLBACK_ADDRESS);

        const stakingTx = await usdcContract.transfer(process.env.STAKING_CONTRACT || FALLBACK_ADDRESS, lastTwo);
        await stakingTx.wait();
        // console.log('✅ Successfully sent to STAKING_CONTRACT!');
        // // console.log('Amount sent:', lastTwo.toString());
        // console.log('Transaction hash:', stakingTx.hash);

        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        console.log('🎉 === FEE DISTRIBUTION COMPLETED SUCCESSFULLY ===');
        console.log('Total execution time:', executionTime + 'ms');
        console.log('Currency used: USDC (6 decimals)');
        // console.log('Summary:', {
        //     originalToken: token,
        //     totalUSDCDistributed: totalUSDC.toString(),
        //     billWalletAmount: billAmount.toString(),
        //     devWalletAmount: devAmount.toString(),
        //     tokensBurned: tokenBalance.toString(),
        //     stakingContractAmount: lastTwo.toString()
        // });

        return NextResponse.json({ 
            success: true, 
            executionTimeMs: executionTime,
            swapTxHash: swapTxHash,
            tokenBuyTxHash: tokenBuyReceipt.transactionHash,
            distribution: {
                billWallet: billAmount.toString(),
                devWallet: devAmount.toString(),
                tokenBurnAmount: tokenBalance.toString(),
                stakingContract: lastTwo.toString()
            }
        });

    } catch(error: any) {
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        console.error('❌ === FEE DISTRIBUTION FAILED ===');
        console.error('Execution time before failure:', executionTime + 'ms');
        console.error('Error details:', {
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            name: error?.name
        });
        
        if (error?.transaction) {
            console.error('Transaction that failed:', error.transaction);
        }
        
        if (error?.receipt) {
            console.error('Transaction receipt:', error.receipt);
        }
        
        return NextResponse.json({ 
            success: false, 
            message: 'Fee distribution failed',
            error: error?.message || 'Unknown error occurred',
            executionTimeMs: executionTime
        }, { status: 500 });
    }
}