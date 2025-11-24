# Privy Multi-Platform Authentication Setup

## Implementation Summary

The authentication system now automatically detects whether users are accessing the app through:
- **Farcaster/Base App**: Automatic authentication with wallet and profile information
- **Browser**: Twitter authentication first, then wallet connection

## Changes Made

### 1. MiniKitProvider.tsx
- ✅ Added `'farcaster'` to login methods alongside `'twitter'`
- ✅ Removed embedded wallet auto-creation config (incompatible with Farcaster Mini Apps)
- ✅ Added comments explaining Farcaster Mini App wallet handling

### 2. globalContext.tsx
- ✅ Imported `@farcaster/miniapp-sdk` for Farcaster authentication
- ✅ Added `useLoginToMiniApp` hook from `@privy-io/react-auth/farcaster`
- ✅ Integrated Privy's `ready` and `authenticated` state
- ✅ Added `isFarcasterContext` flag to detect Farcaster/Base App
- ✅ Implemented automatic Farcaster authentication in `useEffect`
- ✅ Updated `authenticateWithTwitter` for browser flow
- ✅ Added `connectWallet` function for browser users
- ✅ Exported new context values: `isFarcasterContext` and `connectWallet`

## Authentication Flows

### Farcaster/Base App Flow
1. User opens app in Farcaster or Base App
2. `isFarcasterContext` is automatically `true`
3. When Privy is `ready` and user is not `authenticated`:
   - Call `initLoginToMiniApp()` to get a nonce
   - Request signature from Farcaster via `miniappSdk.actions.signIn({ nonce })`
   - Authenticate with Privy using `loginToMiniApp({ message, signature })`
4. Privy automatically fetches wallet and profile information
5. User is authenticated ✓

### Browser Flow
1. User opens app in browser
2. `isFarcasterContext` is `false`, `isDesktopWallet` is `true`
3. User clicks "Connect Twitter" → calls `authenticateWithTwitter()`
4. User authenticates with Twitter via Privy
5. User then connects wallet via RainbowKit
6. Both accounts are linked ✓

## Required Dashboard Configuration

### ⚠️ CRITICAL: Configure Allowed Domains
Navigate to your Privy Dashboard:
- Go to **Configuration > App settings > Domains**
- Add these allowed domains:
  - `https://farcaster.xyz` (REQUIRED for Farcaster Mini Apps)
  - Your production domain (e.g., `https://yourapp.com`)
  - Your staging domain if applicable

### Cookie Configuration (if needed)
Farcaster Mini Apps don't support httpOnly cookies. If you encounter issues:
1. Go to **Configuration > App clients**
2. Create a new app client or modify existing one
3. Override cookie settings to disable httpOnly

### Enable Social Login Methods
Ensure these are enabled in **User management > Authentication > Socials**:
- ✅ Farcaster
- ✅ Twitter

## Wallet Handling

### Farcaster/Base App
- **Automatic wallet creation is DISABLED** (not supported in Mini Apps)
- Options:
  1. Use injected wallets from Farcaster app or Base App (recommended)
  2. Manually create embedded wallets at specific onboarding points
  3. Rely on users' existing linked wallets

### Browser
- Users connect external wallets via RainbowKit
- Embedded wallet creation can be enabled if needed

## Testing

### Test in Farcaster/Base App
1. Deploy your app
2. Create a Frame or Mini App in Farcaster
3. Open the app - authentication should happen automatically
4. Verify user profile and wallet are fetched

### Test in Browser
1. Open app in regular browser
2. Click "Connect Twitter" button
3. Complete Twitter OAuth flow
4. Click "Connect Wallet" button
5. Connect wallet via RainbowKit
6. Verify both accounts are linked in Privy dashboard

## Usage in Components

```typescript
import { useGlobalContext } from '@/utils/providers/globalContext';

function MyComponent() {
  const { 
    isFarcasterContext,
    isDesktopWallet,
    hasTwitterProfile,
    authenticateWithTwitter,
    connectWallet,
  } = useGlobalContext();

  if (isFarcasterContext) {
    // Farcaster/Base App context - auto-authenticated
    return <div>Welcome Farcaster user!</div>;
  }

  if (isDesktopWallet) {
    // Browser context - manual authentication
    return (
      <div>
        <button onClick={authenticateWithTwitter}>Connect Twitter</button>
        {hasTwitterProfile && (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
      </div>
    );
  }
}
```

## Known Limitations

1. **Base App Special Requirement**: Users accessing through The Base App must add their Base App Wallet address as an auth address to their Farcaster account
2. **Embedded Wallets**: Cannot auto-create in Farcaster Mini Apps
3. **Cookie Restrictions**: May need custom app client configuration

## Next Steps

1. ✅ Configure allowed domains in Privy Dashboard
2. ⚠️ Test authentication flow in Farcaster/Base App
3. ⚠️ Test authentication flow in browser
4. ⚠️ Update UI components to use new context values
5. ⚠️ Decide on wallet creation strategy for Farcaster users
6. ⚠️ Consider adding Twitter profile linking for Farcaster users

## Troubleshooting

### Farcaster authentication not working
- Verify `https://farcaster.xyz` is in allowed domains
- Check browser console for errors
- Ensure app client cookie settings are correct

### Browser authentication stuck
- Verify Twitter OAuth is configured in Privy
- Check that RainbowKit is properly initialized
- Ensure session provider is wrapping components

### Wallet not appearing
- For Farcaster: Check if wallet is injected by the app
- For Browser: Ensure RainbowKit wallet connection works
- Check Privy user object for linked wallets

## Documentation References

- [Privy Farcaster Mini Apps](https://docs.privy.io/recipes/farcaster/mini-apps)
- [Privy Authentication Overview](https://docs.privy.io/authentication/overview)
- [Farcaster Auth Addresses](https://github.com/farcasterxyz/protocol/discussions/225)
