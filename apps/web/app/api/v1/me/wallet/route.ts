import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKeyRequest } from '@/utils/apiKeyAuth';
import { getWalletBalances } from '@/utils/serverWallet';

// GET: Get bot wallet info and balances
export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKeyRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const tokenAddress = searchParams.get('token') || undefined;

    const balances = await getWalletBalances(
      authResult.botWallet.address,
      tokenAddress
    );

    return NextResponse.json({
      wallet: {
        address: authResult.botWallet.address,
        ethBalance: balances.ethBalance,
        tokenBalance: balances.tokenBalance,
        tokenDecimals: balances.tokenDecimals,
        tokenSymbol: balances.tokenSymbol,
      },
    });
  } catch (error) {
    console.error('[v1/me/wallet] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
