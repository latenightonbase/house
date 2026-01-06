import { erc20Abi } from "@repo/contracts";
import lnobAbi from "@/utils/contracts/abis/lnobAbi";
import { ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const TARGET_TOKEN = "0x05AF98aeBeC91AeF2BD893614a2C333C58855012"; // AUCTION TOKEN
const ZERO_X_API_KEY = process.env.ZERO_X_API_KEY;
const BASE_CHAIN_ID = "8453";

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
            !process.env.STAKING_CONTRACT) {
            console.error('❌ Required wallet addresses not configured');
            console.error('Missing wallets:', {
                BILL_WALLET: !!process.env.BILL_WALLET,
                RISAV_WALLET: !!process.env.RISAV_WALLET,
                STAKING_CONTRACT: !!process.env.STAKING_CONTRACT,
            });
            return NextResponse.json({ success: false, message: 'Required wallet addresses not configured' }, { status: 500 });
        }
        console.log('✅ All environment variables validated');

        // Create provider with skipFetchSetup to avoid network detection issues
        console.log('Setting up blockchain provider...');
        const provider = new ethers.JsonRpcProvider(
            "https://base-mainnet.g.alchemy.com/v2/CA4eh0FjTxMenSW3QxTpJ7D-vWMSHVjq"
        );
        
        // console.log('✅ Provider setup complete');

        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

        console.log('🔄 Initiating token swap process...');
        console.log('Token to swap:', token);
        console.log('Wallet address:', wallet.address);

        let swapTxHash = null;

        // If token is NOT USDC, swap to USDC first
        if (token.toLowerCase() !== USDC_BASE.toLowerCase()) {
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
                
                if (balance === 0n) {
                    console.error('❌ No tokens to sell - balance is zero');
                    return NextResponse.json({ success: false, message: 'No tokens to sell' }, { status: 400 });
                }
            } catch (balanceError) {
                console.error('❌ Failed to get token balance:', balanceError);
                return NextResponse.json({ success: false, message: 'Failed to get token balance' }, { status: 500 });
            }

            console.log('💰 Getting price quote from 0x API...');
            const priceParams = new URLSearchParams({
                chainId: BASE_CHAIN_ID,
                sellToken: token,
                buyToken: USDC_BASE,
                sellAmount: balance.toString(),
                taker: wallet.address,
                slippagePercentage: '0.5',
                gasless: 'false',
                intentOnFilling: 'true',
                enableSlippageProtection: 'true',
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

            if (priceData.issues?.allowance) {
                console.log('🔐 Approving token allowance...');
                const tokenContract = new ethers.Contract(
                    token,
                    ['function approve(address spender, uint256 amount) external returns (bool)'],
                    wallet
                );

                const approveTx = await tokenContract.approve(
                    priceData.issues.allowance.spender,
                    ethers.MaxUint256
                );
                await approveTx.wait();
                console.log('✅ Token allowance approved for spender:', priceData.issues.allowance.spender);
            } else {
                console.log('ℹ️ No token allowance needed');
            }

            console.log('📋 Getting firm quote from 0x API...');
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

            console.log('🔄 Executing token to USDC swap...');
            
            const feeData = await provider.getFeeData();
            const currentGasPrice = feeData.gasPrice || 0n;
            console.log('Current network gas price:', ethers.formatUnits(currentGasPrice, 'gwei'), 'gwei');
            
            const gasPriceGwei = parseFloat(ethers.formatUnits(currentGasPrice, 'gwei'));
            const multiplier = BigInt(gasPriceGwei > 20 ? 105 : 110);
            const swapOptimizedGasPrice = (currentGasPrice * multiplier) / 100n;
            
            console.log('Optimized gas price:', ethers.formatUnits(swapOptimizedGasPrice, 'gwei'), 'gwei');
            
            const swapEstimatedGas = quoteData.transaction.gas ? 
                (BigInt(quoteData.transaction.gas) * 120n) / 100n :
                250000n;
            
            const swapTx = await wallet.sendTransaction({
                to: quoteData.transaction.to,
                data: quoteData.transaction.data,
                value: quoteData.transaction.value ? BigInt(quoteData.transaction.value) : undefined,
                gasLimit: swapEstimatedGas,
                gasPrice: swapOptimizedGasPrice,
            });

            const receipt = await swapTx.wait();
            if (!receipt) {
                throw new Error('Transaction receipt is null');
            }
            console.log('✅ Swap completed successfully!');
            console.log('Transaction hash:', receipt.hash);
            console.log('Gas used:', receipt.gasUsed.toString());
            console.log('Gas price used:', swapOptimizedGasPrice.toString());
            console.log('Total gas cost (ETH):', ethers.formatEther(receipt.gasUsed * swapOptimizedGasPrice));
            
            swapTxHash = receipt.hash;
        } else {
            console.log('ℹ️ Token is already USDC, skipping swap...');
        }

        // Get USDC balance
        const usdcContract = new ethers.Contract(
            USDC_BASE,
            ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
            provider
        );
        
        const totalUSDC = await usdcContract.balanceOf(wallet.address);
        console.log('✅ USDC balance retrieved:', totalUSDC.toString());
        console.log('✅ USDC balance (human readable):', ethers.formatUnits(totalUSDC, 6), 'USDC');
        
        if (totalUSDC === 0n) {
            console.error('❌ No USDC to distribute - balance is zero');
            return NextResponse.json({ success: false, message: 'No USDC to distribute' }, { status: 400 });
        }

        // Calculate distribution amounts (25% RISAV, 12.5% BILL, 62.5% buy/burn)
        const risavAmount = (totalUSDC * 1n) / 4n;  // 25%
        const billAmount = (totalUSDC * 1n) / 8n;   // 12.5%
        const buyBurnAmount = totalUSDC - risavAmount - billAmount; // 62.5%

        // USDC contract for transfers
        console.log('🏦 Setting up USDC contract for transfers...');
        const usdcTransferContract = new ethers.Contract(
            USDC_BASE,
            ['function transfer(address to, uint256 amount) external returns (bool)'],
            wallet
        );

        console.log('💸 Sending 25% to RISAV_WALLET...');
        const risavTx = await usdcTransferContract.transfer(process.env.RISAV_WALLET, risavAmount);
        await risavTx.wait();
        console.log('✅ Sent to RISAV_WALLET:', risavAmount.toString(), 'Hash:', risavTx.hash);

        console.log('💸 Sending 12.5% to BILL_WALLET...');
        const billTx = await usdcTransferContract.transfer(process.env.BILL_WALLET, billAmount);
        await billTx.wait();
        console.log('✅ Sent to BILL_WALLET:', billAmount.toString(), 'Hash:', billTx.hash);

        const tokenBuyParams = new URLSearchParams({
            chainId: BASE_CHAIN_ID,
            sellToken: USDC_BASE,
            buyToken: TARGET_TOKEN,
            sellAmount: buyBurnAmount.toString(),
            taker: wallet.address,
            slippagePercentage: '0.5',
            gasless: 'false',
            intentOnFilling: 'true',
            enableSlippageProtection: 'true',
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
                ethers.MaxUint256
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
        const tokenFeeData = await provider.getFeeData();
        const tokenSwapGasPrice = tokenFeeData.gasPrice || 0n;
        console.log('Current network gas price for token swap:', ethers.formatUnits(tokenSwapGasPrice, 'gwei'), 'gwei');
        
        // Use a more conservative gas price multiplier based on current conditions
        const tokenGasPriceGwei = parseFloat(ethers.formatUnits(tokenSwapGasPrice, 'gwei'));
        const tokenMultiplier = BigInt(tokenGasPriceGwei > 20 ? 105 : 110); // Lower multiplier if gas is already high
        const tokenOptimizedGasPrice = (tokenSwapGasPrice * tokenMultiplier) / 100n;
        
        console.log('Optimized token swap gas price:', ethers.formatUnits(tokenOptimizedGasPrice, 'gwei'), 'gwei');
        
        // Estimate gas limit (0x API provides estimate, but we can optimize)
        const tokenEstimatedGas = tokenQuoteData.transaction.gas ? 
            (BigInt(tokenQuoteData.transaction.gas) * 120n) / 100n : // 20% buffer
            200000n; // fallback gas limit
        
        const tokenBuyTx = await wallet.sendTransaction({
            to: tokenQuoteData.transaction.to,
            data: tokenQuoteData.transaction.data,
            value: tokenQuoteData.transaction.value ? BigInt(tokenQuoteData.transaction.value) : undefined,
            gasLimit: tokenEstimatedGas,
            gasPrice: tokenOptimizedGasPrice,
        });

        const tokenBuyReceipt = await tokenBuyTx.wait();
        if (!tokenBuyReceipt) {
            throw new Error('Token buy transaction receipt is null');
        }
        console.log('✅ Token purchase completed successfully!');
        console.log('Transaction hash:', tokenBuyReceipt.hash);
        console.log('Gas used:', tokenBuyReceipt.gasUsed.toString());
        console.log('Gas price used:', tokenOptimizedGasPrice.toString());
        console.log('Total gas cost (ETH):', ethers.formatEther(tokenBuyReceipt.gasUsed * tokenOptimizedGasPrice));

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

        if (tokenBalance !== 0n) {
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

        console.log('✅ Token purchase and burn process finished');

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
            tokenBuyTxHash: tokenBuyReceipt.hash,
            distribution: {
                billWallet: billAmount.toString(),
                risavWallet: risavAmount.toString(),
                tokenBurnAmount: tokenBalance.toString()
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