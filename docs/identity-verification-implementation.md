# Bese26 Identity Verification Implementation

Bese26 now has a Supabase-backed identity verification request flow that reuses `verification_applications` rather than creating a duplicate request table. Identity-specific fields are additive and are only exposed through authenticated, user-scoped queries or moderator workflows.

The user flow supports pre-filled personal information, contact display, document type and masked document reference, private front/back document uploads, optional supporting selfie upload, review confirmation, draft persistence, and controlled submission. A submitted request is shown as **Pending Review** and is never marked verified by the browser. Automated liveness remains explicitly unavailable until a real server-side KYC provider is configured.

Identity documents are stored in the existing private `verification-documents` bucket. The storage policies constrain paths to the authenticated user's UUID, with moderator read access only. Documents are not included in public profile, listing, storefront, or SEO queries.

The `submit_identity_verification` RPC validates required fields and the accuracy confirmation before changing a draft to `pending_review`. The `review_identity_verification` RPC requires moderator access, records the decision, and only sets the profile verification flag after an authorized moderator marks the request `verified`. The frontend cannot set provider results or self-approve.

The migration must be applied to the connected Supabase project before production users can submit identity requests. The code also removes the production-breaking `business_profiles.verification_kind` read from the current Verification Center; the existing business verification-kind migration remains available for environments that require that field.

The provider boundary is represented by `src/lib/kycProvider.js`. It intentionally refuses to claim automated results until server-side provider credentials and signature-validated webhooks are configured.
