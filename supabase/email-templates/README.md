# Bese26 branded Supabase email templates

Wadannan templates suna amfani da:

- Official domain: `https://bese26.shop`
- Logo: `https://bese26.shop/images/bese26-official-logo.png`
- Brand colors: Bese26 red `#d8243f`, navy `#172033`, soft background `#f5f7fb`
- Supabase variable: `{{ .ConfirmationURL }}`

## Yadda ake saka su a Supabase

1. Buɗe Supabase project **Bebe26**.
2. Je zuwa **Authentication → Email Templates**.
3. A **Reset Password**, kwafi dukkan abin da ke cikin `bese26-password-reset.html`, sannan ka manna shi a HTML editor.
4. A **Confirm signup**, kwafi dukkan abin da ke cikin `bese26-confirm-signup.html`.
5. Danna **Save**.
6. A **Authentication → URL Configuration**, tabbatar da:
   - Site URL: `https://bese26.shop`
   - Redirect URL: `https://bese26.shop`
   - Redirect URL: `https://bese26.shop/**`
7. Ka aika sabon reset email domin gwaji. Kada ka gwada tsohon email saboda yana iya ɗauke da tsohon template ko tsohon redirect.

## Muhimmin tsaro

- Kada a maye gurbin `{{ .ConfirmationURL }}` da static link.
- Kada a saka secret key ko service-role key a email template.
- Logo da links suna amfani da HTTPS ne kawai.
- Wannan template yana aiki da Supabase Auth email delivery; ba ya canza SMTP provider ɗin da aka saita.

## Abubuwan da template ya ƙunsa

- Bese26 official logo da domain
- Red/white premium card layout
- Mobile responsive email structure
- Clear call-to-action button
- Security note da expiry guidance
- Support email: `info@bese26.shop`
- Marketplace positioning: Buy · Sell · Connect
- Account feature summary
