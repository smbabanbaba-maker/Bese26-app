# SMTP repair references

Official Supabase sources consulted on 2026-08-27:

- https://supabase.com/docs/guides/auth/auth-smtp — Supabase custom SMTP setup. Custom SMTP requires a provider account and its SMTP server settings and credentials; sender details and SMTP credentials are configured under Authentication > Emails > SMTP Settings.
- https://supabase.com/docs/guides/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y — Google SMTP troubleshooting. The SMTP password must be a Google App Password; two-step verification is required first. For `smtp.gmail.com`, port 465 or 587 can be used.
- https://supabase.com/docs/guides/auth/auth-email-templates — Hosted projects edit authentication email templates under Authentication > Emails > Templates. The Magic link or OTP template uses `{{ .Token }}` for a six-digit OTP and `{{ .ConfirmationURL }}` for a link.

Current Bese26 dashboard observation for the authorized Supabase project `slxsbvuskgkacmtkkrmj`: Custom SMTP is ON; sender and username are the Bese26 Gmail account; host is `smtp.gmail.com`; port is `587`; password is not viewable and has not been handled by the agent. The app previously returned `Error sending confirmation email`, so successful delivery is not claimed until a controlled test reaches Inbox/Spam and sign-in succeeds.

Security note: any Gmail password, App Password, or backup code exposed during earlier setup should be revoked/rotated by the account owner. No secret belongs in chat, GitHub, or the repository.
