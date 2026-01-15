# S3 Image Upload Setup Guide

## Overview
This implementation adds optional image upload functionality to auctions using AWS S3 with pre-signed URLs.

## Prerequisites
- AWS Account with S3 access
- AWS IAM user with S3 permissions

## AWS S3 Setup

### 1. Create S3 Bucket
```bash
# Using AWS CLI
aws s3 mb s3://your-auction-images --region us-east-1
```

### 2. Configure Bucket Policy
Add this policy to allow public read access to uploaded images:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-auction-images/*"
    }
  ]
}
```

### 3. Configure CORS
Add CORS configuration to allow uploads from your application:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 4. Create IAM User
Create an IAM user with programmatic access and attach this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-auction-images/*"
    }
  ]
}
```

## Environment Configuration

Add these variables to your `.env.local`:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your-auction-images
```

## How It Works

### Upload Flow
1. **User Selects Image**: User selects image in CreateAuction form (Step 1)
2. **Local Preview**: Image is stored locally and preview is shown
3. **Blockchain Transaction**: User completes form and submits blockchain transaction
4. **Transaction Success**: When blockchain transaction succeeds, `processSuccess` is called
5. **Image Upload**: API route receives the image file via FormData
6. **Upload to S3**: Server validates and uploads image to S3 using presigned URL
7. **Save to Database**: If S3 upload succeeds, auction is created with imageUrl
8. **Atomic Operation**: If S3 upload fails, entire auction creation fails (ensures consistency)
9. **Display**: Images displayed in auction cards and detail pages

### Benefits of This Approach
- **Atomic Operations**: Image only uploaded if blockchain transaction succeeds
- **Consistency**: If image upload fails, auction creation fails (no orphaned data)
- **No Wasted Storage**: Failed transactions don't leave images in S3
- **Better UX**: User sees local preview immediately, upload happens in background

### File Validation
- **Allowed types**: JPEG, PNG, WebP, GIF
- **Max size**: 5MB
- **Naming**: UUID-based to prevent conflicts
- **Validation**: Both client-side (immediate feedback) and server-side (security)

### Security
- Auction creation endpoint requires Privy authentication
- Server-side file validation (type and size)
- Files stored with public-read ACL for display
- Original filenames sanitized with UUID naming

## Testing

1. Start the development server
2. Navigate to Create Auction page
3. Upload an image in Step 1 (optional)
4. Complete auction creation
5. Verify image appears in:
   - Landing page auction cards
   - Auction detail page
   - User profile pages

## Troubleshooting

### Upload fails with 403 error
- Check AWS credentials in `.env.local`
- Verify IAM user has PutObject permission
- Ensure bucket policy allows public reads

### Images don't display
- Check `next.config.ts` includes S3 domain in `remotePatterns`
- Verify bucket CORS configuration
- Check browser console for image loading errors

### CORS errors
- Update CORS configuration with your domain
- Include both HTTP and HTTPS origins
- Restart Next.js dev server after config changes

## File Structure

```
apps/web/
├── app/api/
│   └── protected/auctions/create/
│       └── route.ts          # Handles image upload and auction creation
├── components/
│   ├── ImageUpload.tsx       # File selection and preview component
│   ├── CreateAuction.tsx     # Form with image upload step
│   ├── LandingAuctions.tsx   # Display images in cards
│   └── BidsPage.tsx          # Display in detail view
└── utils/
    └── s3/
        ├── s3Client.ts       # AWS S3 client setup
        ├── generatePresignedUrl.ts
        └── imageValidation.ts
```

## Optional Enhancements

### CloudFront CDN (Recommended for Production)
1. Create CloudFront distribution pointing to S3 bucket
2. Update `imageUrl` generation to use CloudFront domain
3. Add CloudFront domain to `next.config.ts` remotePatterns

### Image Optimization
- Install `sharp` for server-side image processing
- Create thumbnails on upload
- Store multiple sizes (thumbnail, medium, large)

### Deletion
- Implement delete endpoint at `/api/images/[key]/route.ts`
- Allow auction creators to remove/replace images
- Clean up S3 when auctions deleted
