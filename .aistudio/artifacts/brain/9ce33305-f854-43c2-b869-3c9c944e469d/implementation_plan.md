# Implementation Plan - Google Drive Integration for Proof of Payment Uploads

## User Requirement
Connect proof of payment uploads by sales reps to a company Google Drive folder so that all uploaded payment receipts and transfer confirmations are stored securely in Google Drive with ample storage capacity, rather than consuming Firestore database document size limits.

## Proposed Changes

### 1. OAuth & Google Workspace Configuration
- Configure Google Workspace OAuth scope: `https://www.googleapis.com/auth/file-upload` or `https://www.googleapis.com/auth/drive.file` for uploading files to Google Drive.
- Initialize Google OAuth client in the frontend to authenticate the company admin or sales rep Google account.

### 2. Google Drive Service Utility (`src/lib/googleDrive.ts`)
- Implement a Google Drive API helper utility to handle uploading files (images, PDFs) directly to a designated Google Drive folder (or creating a "Green Collar Invoices - Proof of Payments" folder automatically).
- Return the webViewLink or direct file URL and file ID to be saved on the invoice document in Firestore.

### 3. Invoice Generator & Payment Proof Modal Updates (`src/pages/Invoices.tsx`)
- Update the payment proof upload handler to upload the file to Google Drive via the Google Drive API.
- Store the returned Google Drive file URL and metadata on the invoice record in Firestore instead of storing large base64 strings.
- Update the "View Proof" modal to display the image or PDF fetched from the Google Drive file link.

## Verification Plan
- Compile and lint the app to ensure zero TypeScript errors.
- Verify OAuth authentication flow and Google Drive file upload handling.
