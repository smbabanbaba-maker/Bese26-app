# Bese26 Post-Launch Bug Tracking da Monitoring Playbook

## Manufa

Wannan tsarin zai taimaka wajen gano matsala da wuri, rage lokacin da app yake cikin matsala, kare user data, da tabbatar da cewa kowane bug yana da owner, priority, reproduction steps, da ranar gyara. A duk lokacin da aka samu matsala, a fara da kare user da bayanansa kafin a nemi saurin gyara.

## 1. Ka shirya monitoring kafin launch

### Vercel

A kunna deployment logs, build logs, runtime logs idan project ɗin yana da server functions, da deployment notifications. A riƙe deployment na ƙarshe da ya yi aiki domin rollback ya zama mai sauƙi. Kada a share previous stable deployment.

### Supabase

A duba Database Logs, API Logs, Auth Logs, Storage Logs, da Realtime Logs. A saka ido kan slow queries, failed RPCs, RLS errors, storage permission errors, connection errors, da authentication failures. A yi database backup kafin manyan migrations ko manyan frontend releases.

### Application logging

A tabbatar errors suna da abubuwan da ba su fallasa secrets ba. Kada a saka password, access token, service-role key, KYC document URL, ko private message body cikin logs. Duk error report ya ƙunshi timestamp, route, user type, browser/device, operation, da safe request identifier idan akwai.

### Support channels

Ka samu hanya ɗaya ta karɓar reports, misali `support@bese26.shop` ko form ɗin support. Kada a bar reports su watse a WhatsApp, Instagram, email, da comments ba tare da tracking ba. Duk report a ba shi issue ID.

## 2. Abubuwan da za a duba kullum

| Lokaci | Abin dubawa | Abin da ake nema |
|---|---|---|
| Safe | Vercel deployment da errors | Failed deployment, blank screen, asset 404 |
| Safe | Supabase Auth/API logs | Login failures, 401/403, RPC errors, RLS errors |
| Safe | Storage logs | Failed avatar, listing, KYC, ad, ko chat uploads |
| Rana | Marketplace flows | Search, listing reads, public Miniweb, follow, save |
| Rana | User activity | New listings, reports, KYC queue, messages, failed actions |
| Dare | Database health | Slow queries, unusual traffic, failed jobs, backup status |
| Kowane incident | Privacy/security | Data leakage, unauthorized access, suspicious account activity |

A yi wannan duba sau biyu a rana a kwanaki bakwai na farko. Bayan app ya daidaita, a koma duba sau ɗaya a rana, sannan a yi weekly review.

## 3. Core health checks

A riƙa gwada waɗannan workflows daga production domain:

1. Buɗe homepage.
2. Buɗe Search.
3. Buɗe business directory.
4. Buɗe public Miniweb ba tare da login ba.
5. Login da test account.
6. Buɗe listing detail.
7. Save da unsave listing.
8. Follow da unfollow seller.
9. Aika test message.
10. Buɗe Notifications.
11. Buɗe Sell page.
12. Buɗe Admin Center da admin account.
13. Duba verification queue.
14. Duba advertising placement.
15. Gwada public route daga incognito browser.

Idan ɗaya daga cikin waɗannan ya kasa, a rubuta issue nan take ko a ɗaga incident idan core function ne.

## 4. Bug report template

Kowane bug report ya yi amfani da wannan tsarin:

```text
Issue ID:
Ranar da aka gani:
Lokaci da timezone:
Reported by:
Account type: buyer / seller / business / admin / signed-out
Severity: P0 / P1 / P2 / P3
Environment: production / staging
URL ko route:
Device da browser:

Takaitaccen matsala:

Matakan sake haifar da matsalar:
1.
2.
3.

Abin da aka zata:
Abin da ya faru a zahiri:
Sau nawa take faruwa: always / often / once
User impact:
Screenshot ko screen recording:
Relevant Vercel/Supabase log reference:
Temporary workaround:
Owner:
Status:
Fix deployment:
Regression test:
```

Kada a rubuta password, token, full KYC document, ko private message a cikin ticket.

## 5. Severity da response time

| Severity | Ma'anarta | Misalai | Aiki |
|---|---|---|---|
| P0 Critical | Matsala mai tsanani ga tsaro, data, ko manyan users | Private data leakage, database corruption, login ya fadi ga kowa, duplicate real charges | Dakatar da traffic ko affected feature nan take; sanar da owner; rollback ko hotfix |
| P1 High | Core workflow ya kasa ga users da yawa | Create listing ya kasa, chat ya kasa, KYC submit ya kasa, admin moderation ta kasa | A fara cikin awa 1; a yi update akai-akai; kada a ƙara public traffic idan impact yana ƙaruwa |
| P2 Medium | Feature yana da matsala amma akwai workaround | Filter ya kasa a wani browser, notification delay, edit field issue | A ba shi owner cikin rana ɗaya; a gyara cikin sprint na kusa |
| P3 Low | Cosmetic ko ƙaramin usability issue | Spacing, copy, icon alignment, non-blocking animation | A tara shi cikin polish backlog; a gyara ba tare da rushe core release ba |

Idan ba a tabbatar da severity ba, a ɗaga shi zuwa mafi girman classification na ɗan lokaci har sai an bincika.

## 6. Incident response matakai

### Mataki na farko: Tabbatar da matsalar

Sake gwada matakan a production. Yi amfani da test account idan ba matsalar privacy ba ce. Duba ko matsalar tana faruwa ga mutum ɗaya, browser ɗaya, ko kowa. Kada a yi repeated destructive actions yayin bincike.

### Mataki na biyu: Kare users

Idan matsalar ta shafi payment, privacy, KYC, auth, ko data loss, dakatar da affected flow. A kashe advert ko feature idan ya dace. A hana ƙarin duplicate submissions. A rubuta lokacin da matsalar ta fara.

### Mataki na uku: Fitar da incident owner

Mutum ɗaya ya zama owner. Owner zai rubuta updates, ya haɗa logs, ya yanke ko a rollback, ya tabbatar da fix, kuma ya rufe incident bayan regression test.

### Mataki na huɗu: Gyara ko rollback

Idan matsalar ta fito daga sabon frontend deployment, yi rollback zuwa deployment na ƙarshe da ya yi aiki. Idan matsalar migration ce, kada a sake tura random SQL. A rubuta corrective migration, a review ta, sannan a yi backup kafin a run.

### Mataki na biyar: Tabbatar da fix

Sake gwada original reproduction steps. Sannan a gwada related workflows domin a tabbatar fix ɗin bai karya wani abu ba. A yi test a mobile da desktop idan matsalar UI ce.

### Mataki na shida: Rufe incident

A rufe incident ne kawai idan an sami fix deployment, regression test ya wuce, logs sun koma normal, kuma an rubuta root cause. Idan users sun san matsalar, a aika short update mai gaskiya.

## 7. Abin da user support zai aika

### Lokacin da ake bincike

> Mun samu rahoton matsalar kuma muna bincikarta. Ba ka buƙatar sake tura bayananka ko ka maimaita biyan kuɗi. Za mu sanar da kai bayan an tabbatar da mafita.

### Bayan an gyara

> An gyara matsalar da ta shafi wannan aikin. Ka sake buɗe app ɗin ko ka refresh page. Idan matsalar ta ci gaba, turo mana da route, device, da lokacin da ta faru.

Kada support ya yi alkawarin refund, verification approval, ko account restoration ba tare da tsarin da aka amince da shi ba.

## 8. Weekly bug review

A ƙarshen kowane mako, a duba:

- Sabbin bugs da aka buɗe.
- Bugs da aka rufe.
- Mafi yawan routes da ke faduwa.
- Mafi yawan browsers/devices masu errors.
- Failed auth attempts.
- Failed uploads.
- RLS da permission errors.
- KYC queue da lokacin response.
- Ad campaigns da suka kasa ko suka nuna ba daidai ba.
- Users da suka kasa kammala signup ko listing creation.

A rarraba issues uku: a gyara nan take, a saka cikin next release, ko a mayar da shi backlog.

## 9. Release da regression discipline

Kada a tura manyan canje-canje kai tsaye ba tare da build da smoke test ba. Kowane release ya bi wannan tsari:

```bash
npm run build
git diff --check
```

Bayan deployment, a gwada homepage, login, search, listing detail, public Miniweb, follow, chat, sell, da admin route. A kiyaye deploy hash ko version a cikin bug report domin a san wane release ne ya haifar da matsala.

Kada a haɗa database migration mai haɗari da manyan UI changes a release guda idan za a iya raba su. A yi migration, a tabbatar schema, sannan a tura frontend da ke amfani da schema ɗin.

## 10. Security da privacy monitoring

A ɗauki waɗannan a matsayin P0 har sai an tabbatar akasin haka:

- User ya ga wani user's KYC document.
- User ya ga private messages na wani.
- Seller ya iya canza listing na wani seller.
- Buyer ya iya ganin draft ko private contact.
- Non-admin ya shiga Admin Center.
- Service-role key ya bayyana a client bundle ko logs.
- Verification tick ya bayyana ba tare da approval ba.
- Payment ya maimaita ko ya nuna success ba tare da verified callback ba.

Idan ɗaya ya faru, a dakatar da affected operation, a tattara evidence ba tare da kwashe private data ba, a canza credentials idan akwai secret leak, sannan a yi incident review.

## 11. Metrics na makon farko

A riƙa rubuta waɗannan metrics ba tare da tattara unnecessary personal data ba:

- Signup success rate.
- Login failure rate.
- Listing creation success rate.
- Image upload failure rate.
- Search success da empty-result rate.
- Message send failure rate.
- Follow/unfollow failure rate.
- KYC submission failure rate.
- Admin review turnaround time.
- P0/P1 incident count.
- Average time to acknowledge bug.
- Average time to resolve bug.

Manufa ba wai kawai a tara metrics ba ce. Ana amfani da su wajen gano inda users suke barin flow ko inda backend yake da rauni.

## 12. Checklist kafin a ce app ɗin ya daidaita

A ɗauki post-launch system a matsayin stable idan an samu kwanaki 7 ba tare da P0 ba, babu unresolved P1 da ya shafi core workflow, login/signup yana aiki, listing creation yana aiki, public Miniweb yana aiki, chat da notifications suna aiki, KYC documents suna private, admin moderation yana aiki, kuma an yi backup mai nasara.

## Tsarin aiki na gaggawa

Idan matsala ta taso, bi wannan gajeren tsari:

```text
1. Tabbatar da matsalar.
2. Sanya P0/P1/P2/P3.
3. Kare users da data.
4. Sanya incident owner.
5. Duba Vercel da Supabase logs.
6. Rollback ko gyara bisa evidence.
7. Yi regression test.
8. Sanar da affected users.
9. Rubuta root cause.
10. Rufe issue bayan an tabbatar da fix.
```

## Shawarar aiki ga Bese26

A makon farko ka sa mutum ɗaya ya zama technical owner, mutum ɗaya ya zama admin/support owner, sannan a yi daily review na minti 15. Ajiye bug tickets a wuri guda. Kada a dogara da memory ko saƙonnin WhatsApp kawai. Idan matsalar ta shafi security, payment, KYC, ko private data, a dakatar da affected feature har sai an tabbatar da gyara.
