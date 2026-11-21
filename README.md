# SYLUTION TRADE

**Global B2B Marketplace — new MVP frontend**, by SYLUTION LTD.

## What works now
- Responsive green-and-white marketplace homepage based on the approved reference design
- Product cards, search, category filters, featured supplier sidebar
- Product detail pages and specification tables
- Interactive Request for Quotation (RFQ) form
- Demo RFQs saved in the visitor's browser using localStorage

## Important
This is a working **frontend demo**, not a live trading service. Products, suppliers, ratings and prices are fictional illustrative data. The RFQ button does **not** send email, contact sellers or write to Supabase. No company is represented as verified.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Deploy
Import this repository into Vercel with **Next.js** selected. If an earlier Vercel project still points here, its production deployment may change after this commit. Review environment variables and deployment settings.

## Next engineering phases
1. Set up Supabase project, migrations, auth and Row Level Security
2. Buyer/supplier company profiles and approval flow
3. Product management, storage uploads and publishing
4. Secure server-side RFQ persistence, notifications and quotation workflow
5. Moderation, reporting, verification and rate limiting

See `supabase/schema.sql` for a **draft**, not production-ready migration.

## Original Bese26 codebase
Preserved at branch `backup/bese26-before-sylution-trade-2026-11-21`. The old app was not deleted from GitHub history. Existing Supabase data and Vercel settings were not altered intentionally.
