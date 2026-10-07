# Bese26 branded Supabase email templates

Wadannan templates suna amfani da:

- Official domain: `https://bese26.shop`
- Logo: `https://bese26.shop/images/bese26-official-logo.png`
- Brand colors: Bese26 red `#d8243f`, navy `#172033`, soft background `#f5f7fb`
- Signup, resend, and password-recovery OTP variable: `{{ .Token }}`

## OTP-only authentication

Bese26 yanzu yana amfani da OTP ne ga signup da Forgot password: user yana karɓar 6-digit code, ya shigar da shi a cikin app, sannan app ɗin ya tabbatar da code ɗin. Ba a amfani da confirmation URL ko reset link a waɗannan flows.

## Yadda ake saka su a Supabase

1. Buɗe Supabase project **Bebe26**.
2. Je zuwa **Authentication → Email Templates → Magic link or OTP**.
3. Kwafi `bese26-confirm-signup.html` ko branded OTP body ɗin da aka saita a dashboard, sannan ka manna shi a HTML editor.
4. Je zuwa **Authentication → Email Templates → Confirm signup** ka tabbatar yana amfani da `{{ .Token }}` idan Supabase ya yi amfani da shi wajen confirmation email.
5. Danna **Save**.
6. A **Authentication → URL Configuration**, Site URL ya kasance `https://bese26.shop`.

## Muhimmin tsaro

- Kada a saka confirmation URL a signup ko password-recovery template.
- Kada a saka static OTP code a template. Supabase ne yake samar da code mai digits 6.
- Kada a saka secret key ko service-role key a email template.
- Logo da links suna amfani da HTTPS ne kawai.
- SMTP provider ne ke tura email; templates ba sa canza SMTP settings.

## Gwaji

- **Register:** sabon user ya karɓi OTP, ya shigar da shi a Bese26, ya shiga.
- **Forgot password:** user ya karɓi OTP, ya tabbatar da shi a Bese26, ya sa sabon password.
- Babu buɗe Supabase, Vercel, ko wani external confirmation page.
