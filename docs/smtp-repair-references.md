# SMTP repair references

Official Supabase sources consulted on 2026-08-27:

- https://supabase.com/docs/guides/auth/auth-smtp — Supabase custom SMTP setup. Custom SMTP requires a provider account and its SMTP server settings and credentials; sender details and SMTP credentials are configured under Authentication > Emails > SMTP Settings.
- https://supabase.com/docs/guides/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y — Google SMTP troubleshooting. The SMTP password must be a Google App Password; two-step verification is required first. For `smtp.gmail.com`, port 465 or 587 can be used.
- https://supabase.com/docs/guides/auth/auth-email-templates — Hosted projects edit authentication email templates under Authentication > Emails > Templates. The Magic link or OTP template uses `{{ .Token }}` for a six-digit OTP and `{{ .ConfirmationURL }}` for a link.

Current Bese26 dashboard observation for the authorized Supabase project `slxsbvuskgkacmtkkrmj`: Custom SMTP is ON; sender and username are the Bese26 Gmail account; host is `smtp.gmail.com`; port is `587`; password is not viewable and has not been handled by the agent. The app previously returned `Error sending confirmation email`, so successful delivery is not claimed until a controlled test reaches Inbox/Spam and sign-in succeeds.

Security note: any Gmail password, App Password, or backup code exposed during earlier setup should be revoked/rotated by the account owner. No secret belongs in chat, GitHub, or the repository.

## Live Auth log finding — 2026-08-27

The latest authorized Supabase Auth log for `/signup` returned HTTP 500 with SMTP error `535 5.7.8 Username and Password not accepted ... - gsmtp`. This confirms the failure occurs at Gmail SMTP authentication, before the confirmation email can be delivered. It is not a Vercel UI error and not an email-template rendering error. The log contains no usable password or App Password and none was copied into this repository.

## Reversion completed — 2026-08-27

In the authorized Bebe26 Supabase project, Custom SMTP was disabled and the change was confirmed by reloading the SMTP settings page: only the disabled toggle and Save changes control remain, with no Gmail host/username/password fields. The Email Templates page now explicitly says emails use the default templates and custom template editing requires SMTP setup. Supabase displayed the warning that built-in SMTP has a 2-emails-per-hour limit and resets custom templates.

## Production redirect fix — 2026-08-27

Supabase URL Configuration showed the Site URL was `http://localhost:3000`. It was changed and saved to `https://bese26-app.vercel.app`. Redirect URLs remained empty because the password confirmation flow can use the Site URL as the default redirect. This fixes the observed confirmation link destination; it does not change the already-working built-in email sender.

## Redirect verification — 2026-08-27

After reloading the authorized URL Configuration page, the Site URL persisted as `https://bese26-app.vercel.app`; the previous `http://localhost:3000` value is gone. No redirect URLs are listed, so Supabase uses this Site URL as the default destination.
