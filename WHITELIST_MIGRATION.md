# Whitelist Migration Instructions

This migration moves the hardcoded whitelist from `apps/web/utils/whitelist.ts` to a MongoDB database with full CRUD admin interface.

## What Was Changed

### 1. New Database Schema
- **File**: `apps/web/utils/schemas/Whitelist.ts`
- **Fields**: 
  - `walletAddress` (unique, indexed, lowercase)
  - `nickname` (optional)
  - `addedBy` (tracks who added the entry)
  - `status` (ACTIVE/INACTIVE for soft deletes)
  - `createdAt`, `updatedAt` (auto-generated timestamps)

### 2. Admin API Routes (Protected by FID 666038)
All routes under `/api/admin/whitelist/`:
- **POST** `/add` - Add new wallet to whitelist
- **GET** `/list` - List all whitelisted wallets
- **PATCH** `/update` - Update nickname or status
- **DELETE** `/remove` - Remove wallet from whitelist

### 3. Updated Whitelist Checks
- `apps/web/components/CreateAuction.tsx` - Now queries database via API
- `apps/web/app/api/users/[userId]/checkWhitelist/route.ts` - Queries database instead of hardcoded array

### 4. Admin Dashboard
- **File**: `apps/web/app/admin/page.tsx`
- **Access**: Only users with Farcaster ID 666038
- **Features**:
  - View all whitelisted wallets in a table
  - Add new wallets with optional nicknames
  - Edit nicknames for existing entries
  - Toggle status (ACTIVE/INACTIVE)
  - Delete wallets from whitelist

### 5. Migration Script
- **File**: `scripts/migrate-whitelist-to-db.ts`
- Seeds all 45 existing wallet addresses into the database
- Preserves nicknames from comments in original file

## Running the Migration

### Step 1: Run the Migration Script

```powershell
cd F:\Codes\auction-house\apps\web
npx tsx ../../scripts/migrate-whitelist-to-db.ts
```

Note: Use `tsx` instead of `ts-node` to avoid ESM compatibility issues.

The script will:
- Connect to your MongoDB database
- Add all 45 wallet addresses with their nicknames
- Skip any addresses that already exist
- Output a summary of the migration

### Step 2: Verify Migration

Check the output for:
- ✅ Successfully added: X addresses
- ✅ Skipped (already exists): Y addresses
- ❌ Errors: 0

### Step 3: Test the Admin Panel

1. Navigate to `/admin` in your app
2. Login with Farcaster ID 666038
3. Verify all wallets are visible
4. Test CRUD operations:
   - Add a test wallet
   - Edit a nickname
   - Toggle status
   - Delete the test wallet

### Step 4: Test Whitelist Check

1. Try creating an auction with a whitelisted wallet ✅
2. Try creating an auction with a non-whitelisted wallet ❌

## Important Notes

- The middleware at `middleware.ts` already protects `/api/admin/*` routes with FID 666038 check
- The old `whitelist.ts` file is still in place but no longer used (can be kept as backup or removed)
- All whitelist checks now query the database with status='ACTIVE'
- The admin dashboard is accessible at `/admin` route

## Rollback (If Needed)

If you need to rollback:
1. Revert changes to `CreateAuction.tsx` and `checkWhitelist/route.ts`
2. Re-import `isWhitelisted` from `@/utils/whitelist`
3. The database entries remain as backup

## Future Enhancements

Consider adding:
- Bulk import via CSV
- Activity log for whitelist changes
- Search/filter functionality in admin panel
- Email notifications for whitelist additions
