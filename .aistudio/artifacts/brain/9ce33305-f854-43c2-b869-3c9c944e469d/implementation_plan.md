# Implementation Plan - Invoice Creator Contact, Auto-Save Drafts & Editing Unpaid Invoices

## Completed Requirements

### 1. User Assigned Phone Number on Invoices & Receipts
- Phone number assigned to each user upon account creation in `users` table is dynamically resolved and cached in `AuthContext`.
- `InvoiceGenerator.tsx`, `InvoiceView.tsx`, and `ReceiptView.tsx` display the creator's assigned telephone contact (`repPhone || user?.phone || companySettings?.phone`) on screen and in print/PDF modals.

### 2. Auto-Save Draft While Generating Invoice
- Automatically debounces and persists in-progress changes (`billTo`, client address, phone, manual & price-list items, notes, currency, dates, VAT) to `localStorage` key `gcis_invoice_draft_<username>`.
- Restores draft on page reload with a "Draft Restored" banner and "Discard Draft" option.
- Automatically clears the draft once the invoice is saved or updated.

### 3. Editing Unpaid Invoices with Strict Lockout Once Paid / Proof Uploaded
- Added an **Edit** action in `Invoices.tsx` and an **Edit Invoice** action in `InvoiceView.tsx`.
- The button is only visible to the invoice creator (or admin) while status is `unpaid` and no proof of payment is uploaded.
- Route `/generator?editId=<id>` pre-loads the invoice for editing, displays an editing banner with a Cancel option, and updates the existing invoice record via Supabase upon saving.
- Editing is strictly locked once marked as paid or once payment proof has been uploaded.
