# Bese26 Soft Launch Playbook

## Manufa

Soft launch na Bese26 shi ne sakin app ga ƙaramin rukuni na users da aka zaɓa, domin a gwada ainihin signup, buying, selling, Miniweb, follow, chat, KYC, notifications, payment, da admin moderation kafin a buɗe app ga jama'a gaba ɗaya. A wannan matakin ba a neman yawan users; ana neman gano matsaloli da wuri, a gyara su, sannan a tabbatar da cewa ainihin marketplace flow yana aiki.

## Shawarar rukuni na farko

Fara da users 20 zuwa 30 na tsawon kwanaki 3 zuwa 7. Rukuni ya ƙunshi buyers 10, sellers 8, business owners 5, da admins ko support users 2 zuwa 3. Zaɓi mutane daga jihohi daban-daban na Nigeria, amma ka fara da users da za su iya ba da feedback cikin sauri. Kada ka gayyaci kowa a lokaci guda; aika gayyata a rukuni-rukuni na mutane biyar zuwa goma domin a iya lura da matsalolin da suka taso.

## Phase 0: Shirya kafin ranar launch

### Database da Supabase

Ka tabbatar an yi backup kafin wani canji. Tunda production database ɗinka ya riga ya samu wasu migrations, kada ka sake gudanar da complete 83-migration bundle. Yi amfani da [Bese26 Latest Safe Fix SQL](</home/ubuntu/Bese26-app/supabase/Bese26-LATEST-SAFE-FIX.sql>) kawai idan har yanzu ba a yi amfani da shi ba. Bayan an gama, tabbatar da cewa tables da functions sun wanzu:

```sql
select to_regprocedure('public.current_user_can_moderate()');
select to_regprocedure('public.admin_grant_verification_by_email(text,text)');
select to_regclass('public.admin_verification_grants');
select to_regclass('public.profile_follows');
```

Ka tabbatar buckets biyar suna nan: `avatars`, `listing-media`, `verification-documents`, `ad-assets`, da `chat-media`. Ka duba RLS policies kafin ka buɗe app ga users.

### Vercel da secrets

Saka `VITE_SUPABASE_URL` da `VITE_SUPABASE_PUBLISHABLE_KEY` a Vercel Production environment. Kada ka saka `SUPABASE_SERVICE_ROLE_KEY` ko `PAYSTACK_SECRET_KEY` cikin Vite client variables. Waɗannan secrets su kasance server-side kawai.

### Auth da domain

Zaɓi domain guda ɗaya, misali `https://www.bese26.shop`, sannan ka yi amfani da shi a Site URL, redirect URLs, password reset, OAuth callback, public Miniweb links, da listing links. Gwada email confirmation da password reset kafin gayyatar users.

### Admin readiness

Ka tabbatar owner admin yana da `app_role = 'admin'` kuma ba a suspend ɗinsa ba. Ka shiga Admin Center ka tabbatar waɗannan sections suna load: moderation queue, Verification Center, Advertising Control, Admin Team, reports, support, da marketplace operations. Ka shirya wanda zai amsa user reports a kowace rana.

## Phase 1: Ranar launch

### Mataki na farko: technical smoke test

Kafin ka gayyaci users, ka shiga live app da admin account. Ka gwada home, search, business directory, public Miniweb, profile, sell, messages, notifications, saved, da admin route. Ka buɗe Miniweb a browser wanda bai login ba domin tabbatar da cewa public page yana aiki.

### Mataki na biyu: buyer test

Yi amfani da buyer account ka yi signup, login, search, buɗe listing, save listing, follow seller, buɗe Miniweb, duba Followers/Following, aika message, sannan ka karɓi notification. Ka tabbatar logout da login na biyu suna dawo da state daidai.

### Mataki na uku: seller test

Yi amfani da seller account ka cika profile, ɗora avatar, ƙirƙiri listing, ɗora hotuna, zaɓi location, adana draft, sannan ka publish listing. Ka buɗe listing daga public browser. Ka tabbatar listing ya bayyana a search da seller profile.

### Mataki na huɗu: business test

Ƙirƙiri business profile da business handle. Ka saka logo, category, state, LGA, description, delivery, da pickup. Ka buɗe public Miniweb. Ka tabbatar business name, verification badge idan ya dace, Followers/Following section, listings, about section, da share action suna bayyana ba tare da overflow a waya ba.

### Mataki na biyar: admin test

A matsayin admin, ka approve listing ɗaya, reject wani listing tare da dalili, sannan ka gwada Verification Center. Ka approve request guda ɗaya, ka reject wani tare da reason, ka yi request-information ga wani. Ka yi email verification grant ga test user kuma ka tabbatar tick ya bayyana a profile da Miniweb. Ka ƙirƙiri advert ɗaya, ka duba preview, ka activate, ka tabbatar ya bayyana a Home ko placement ɗin da aka zaɓa, sannan ka pause shi.

## Phase 2: Kwanaki 1 zuwa 3

A kwanaki uku na farko, ka duba app aƙalla sau uku a rana: safe, rana, da dare. A kowane duba, ka bincika auth errors, Supabase errors, failed uploads, listing reports, chat failures, da payment callbacks. Ka rubuta kowanne issue a cikin log tare da lokaci, account type, device, browser, steps da suka haifar da matsalar, da screenshot idan akwai.

Ka nemi kowane early user ya amsa tambayoyi biyar bayan ya yi amfani da app:

1. Me ya fi sauƙi a app?
2. A ina ka tsaya ko ka rikice?
3. Shin ka samu abin da kake nema?
4. Shin listing ko Miniweb ya gamsar da kai?
5. Me za ka gyara kafin ka sake amfani da app?

## Issue severity da abin da za a yi

| Matsayi | Misali | Mataki |
|---|---|---|
| P0 | Login ya kasa ga kowa, database ya lalace, ko private data ya bayyana | Dakatar da gayyata, yi rollback, sannan a gyara kafin a ci gaba |
| P1 | Create listing, upload, chat, KYC, ko payment ya kasa ga yawancin users | Dakatar da sabon traffic, bar existing users su samu support, gyara kafin ƙara users |
| P2 | Wani button ko screen ya yi kuskure amma akwai workaround | Rubuta issue, gyara cikin soft launch, kada a buɗe public launch sai an rage shi |
| P3 | Cosmetic spacing, copy, ko ƙaramin mobile polish | Tara su cikin polish batch bayan an tabbatar da core workflows |

## Go / No-Go criteria

### Kada a buɗe public launch idan

- Login ko signup yana faduwa.
- User yana iya ganin private account, KYC, chat, ko document na wani user.
- Seller ba zai iya create/publish listing ba.
- Buyer ba zai iya buɗe listing ko aika message ba.
- Admin ba zai iya moderation ba.
- Storage upload yana faduwa akai-akai.
- Migration ko RLS error yana bayyana a live database.
- Payment callback ba a tabbatar da shi ba kafin a karɓi real payment.

### Za a iya buɗe public launch idan

- P0 babu.
- P1 babu a core buyer, seller, business, da admin flows.
- An gwada app da mobile da desktop browser.
- An tabbatar da database backup da rollback deployment.
- Admin yana da hanyar ganin reports da warware su.
- At least buyers 5 da sellers 5 sun kammala ainihin flow ba tare da support intervention ba.
- Public Miniweb, verified badge, Followers/Following, da listing routes suna aiki.

## Rollback plan

Idan an gano P0, dakatar da gayyata nan take. Saita advert campaigns zuwa paused. Ka adana error details da timestamp. Mayar da Vercel zuwa deployment na baya idan matsalar frontend ce. Idan matsalar database ce, dakatar da ƙarin migrations kuma yi amfani da Supabase backup ko gyaran SQL da aka review. Kada ka goge users ko listings domin gyara matsala ba tare da backup ba.

## Daily launch report

A ƙarshen kowace rana ka rubuta:

- Sabbin signups.
- Active buyers da sellers.
- Listings da aka ƙirƙira, aka publish, da aka reject.
- Miniweb visits.
- Follows da unfollows.
- Messages da aka aika.
- KYC applications.
- Reports da support tickets.
- Failed API calls ko uploads.
- Matsalolin da aka gyara.
- Matsalolin da suka rage.

## Shawarar ƙarshe

Ka yi soft launch na kwanaki 3 zuwa 7 da users 20 zuwa 30. Kada ka kashe ads ko ka gayyaci jama'a da yawa a rana ta farko. Ka fara da real buyer, seller, business, da admin workflows. Idan babu P0 ko P1 kuma users sun kammala core flows cikin sauƙi, sai ka shiga public launch a hankali. Idan matsala ta shafi database, privacy, login, payment, ko moderation, ka dakatar da public launch har sai an gyara ta.

## Final launch command sequence

Bayan soft launch ya wuce:

```bash
npm run build
git diff --check
git status --short
```

Sai ka tura deployment ɗin da aka gwada zuwa Vercel. Bayan deploy, ka sake buɗe production domain ɗin a incognito browser, ka yi buyer smoke test, sannan ka yi admin smoke test. Kada ka dogara da local build kawai wajen tabbatar da production Supabase behavior.
