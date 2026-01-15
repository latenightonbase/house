# Image Upload Implementation - Updated Flow

## Changes Summary

The image upload implementation has been updated to ensure atomicity and data consistency.

## Previous Flow (❌ Issues)
1. User selects image
2. Image immediately uploaded to S3
3. User completes auction creation
4. If blockchain transaction fails, image remains orphaned in S3
5. If database creation fails, image remains orphaned in S3

**Problems:**
- Orphaned images in S3 from failed transactions
- Wasted storage costs
- No atomicity between upload and auction creation

## New Flow (✅ Improved)
1. User selects image → **Local preview only** (no upload)
2. User completes form and submits
3. Blockchain transaction executes
4. **If blockchain succeeds** → `/api/protected/auctions/create` is called with image file
5. **Server validates** image (type, size)
6. **Server uploads** to S3
7. **If S3 upload succeeds** → Create auction in database with imageUrl
8. **If S3 upload fails** → Return error, no auction created

**Benefits:**
- ✅ Atomic operation: Image only uploaded if transaction succeeds
- ✅ Consistency: Failed uploads = no auction created
- ✅ No orphaned images in S3
- ✅ Better error handling
- ✅ Reduced S3 costs

## Technical Changes

### ImageUpload Component
**Before:**
- Called `/api/upload/presigned-url` immediately
- Uploaded directly to S3 from client
- Passed `imageUrl` and `imageKey` to parent

**After:**
- Only stores File object locally
- Creates local preview with FileReader
- Passes File object to parent (not URL)

### CreateAuction Component
**Before:**
```typescript
const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
const [uploadedImageKey, setUploadedImageKey] = useState<string | null>(null);

// In processSuccess:
body: JSON.stringify({
  imageUrl: uploadedImageUrl,
  imageKey: uploadedImageKey,
})
```

**After:**
```typescript
const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

// In processSuccess:
const formData = new FormData();
formData.append('image', selectedImageFile);
// ... other fields
```

### API Route (`/api/protected/auctions/create`)
**Before:**
- Accepted JSON with `imageUrl` and `imageKey`
- No upload logic

**After:**
- Accepts `FormData` with image file
- Validates image (type, size)
- Uploads to S3 using presigned URL
- If upload fails → returns 500 error
- If upload succeeds → creates auction with imageUrl

## Files Modified

1. **apps/web/components/ImageUpload.tsx**
   - Removed immediate S3 upload
   - Changed to file selection + preview only
   - Props changed: `onUploadComplete` → `onFileSelect`

2. **apps/web/components/CreateAuction.tsx**
   - Changed state from URL strings to File object
   - Modified `processSuccess` to use FormData
   - Updated ImageUpload integration

3. **apps/web/app/api/protected/auctions/create/route.ts**
   - Changed from `req.json()` to `req.formData()`
   - Added image validation logic
   - Added S3 upload logic before database creation
   - Returns error if S3 upload fails

4. **S3_SETUP.md**
   - Updated documentation to reflect new flow

## Error Handling

### Client-Side
- File type validation (immediate feedback)
- File size validation (immediate feedback)
- Form validation before submission

### Server-Side
1. **Image validation fails** → 400 Bad Request
2. **S3 upload fails** → 500 Internal Server Error (auction not created)
3. **Database creation fails** → 500 Internal Server Error

## Testing Checklist

- [ ] Select valid image → See local preview
- [ ] Select invalid type → See error toast
- [ ] Select oversized file → See error toast
- [ ] Create auction with image → Verify uploaded to S3
- [ ] Create auction without image → Works normally
- [ ] Simulate S3 failure → Auction creation fails
- [ ] Cancel after selecting image → Can remove preview
- [ ] View auction with image → Image displays correctly

## Migration Notes

**No database migration needed** - The `imageUrl` and `imageKey` fields are already optional in the schema.

**Existing auctions** - Will continue to work (fields are optional)

**No client changes needed** - Image upload step is optional, users can skip it
