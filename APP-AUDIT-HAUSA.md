# Bese26 App — Cikakken Bincike

**Repository:** `smbabanbaba-maker/Bese26-app`  
**Branch:** `main`  
**Commit da aka duba:** `22a215c` — *Unify hero colors and 16 by 5 sizing*  
**Ranar bincike:** 16 Satumba 2026

## Takaitaccen hukunci

Bese26 app ɗin **React/Vite marketplace ne na Najeriya**, mai haɗa masu saye da masu sayarwa. Ba ƙaramin demo kawai ba ne: source code ɗin yanzu yana da Supabase authentication, database, Row Level Security, media storage, real listings, favorites, profiles, chat, offers, safe-meeting workflows, business storefronts, verification, notifications, admin moderation, subscriptions, Paystack seller payments, boosts, reports, follows, da analytics helpers.

An tabbatar da cewa production build yana kammalawa ba tare da kuskure ba, kuma live URL `https://bese26-app.vercel.app/` yana amsa HTTP 200 daga Vercel. Repository ɗin kuma yana clean kuma branch ɗin `main` yana daidaita da `origin/main`.

Amma app ɗin bai kai matsayin cikakken e-commerce ba tukuna. Abin da yake yi yanzu shi ne **conversation-first marketplace**: mai saye yana nemo kaya, ya ga bayanai, ya ajiye listing, ya kira ko ya tura WhatsApp, ya fara chat, ya yi offer, ko ya tsara haduwa lafiya. Babu cikakken cart, buyer checkout, order tracking, delivery payment, refund, ko escrow workflow.

## 1. Fasahar da aka yi amfani da ita

| Sashe | Abin da aka samu |
|---|---|
| Frontend | React + Vite + JavaScript/JSX |
| Styling | CSS na project, responsive/mobile-first layout, light/dark theme |
| Icons | `lucide-react` |
| Backend | Supabase Auth, Postgres, Storage, Realtime |
| Payments | Paystack server-side endpoints don seller subscription da boosts |
| Deployment | Vercel static deployment |
| Client security | Supabase publishable key kawai a browser; service-role da Paystack secret suna server-side |
| Main entry | `src/App.jsx` |
| Main data layer | `src/lib/marketplace.js` |
| Auth/client | `src/lib/supabase.js` |
| API endpoints | `api/paystack/initialize.js`, `verify.js`, `webhook.js` |

## 2. Manyan sassan da app ɗin yake da su

### Home da marketplace discovery

Home yana nuna approved/active listings daga Supabase, search, categories, featured/promoted listings, recently viewed, notification entry, da bottom navigation. Ana amfani da empty/loading/error states maimakon cike fuska da fake listings.

### Search da listing details

Mai amfani zai iya search da rubutu, category, location, condition, da sort. Listing detail yana nuna:

- hoto/hotuna da gallery;
- farashi da currency;
- location, condition, delivery information;
- seller profile da verified status;
- save/favorite;
- call, WhatsApp, report;
- chat with seller;
- offer;
- safe meeting plan;
- callback request;
- similar listings.

### Saved/Favorites

Mai amfani mai login zai iya ajiye listings. Favorites suna da RLS, don haka user ba zai ga saved items na wani ba. Ana kuma samun saved searches da follow/seller relations a data layer.

### Sell

`src/components/SellView.jsx` yana da sell form mai ci gaba a tsaye. Yana goyon bayan:

- listing title, description, category da subcategory;
- price da currency;
- condition;
- location da delivery options;
- contact preferences;
- hotunan listing da upload zuwa Storage;
- draft persistence;
- edit/resubmit idan an ƙi listing;
- publish zuwa pending moderation;
- personal ko business ownership.

Ana kiyaye seller kada ya iya kai listing kai tsaye zuwa approved ta client; moderation boundary yana cikin database/RPC.

### Authentication

`AuthPanel.jsx` yana amfani da email/password authentication na Supabase. Akwai sign in, create account, session handling, da protected user paths. Google OAuth da phone/SMS OTP ba a tabbatar da su a wannan implementation ba.

### Messages da chat

Chat ya haɗa buyer da seller bisa listing/conversation. Akwai:

- conversation list;
- persisted messages;
- Realtime message subscription;
- chat media upload;
- offers: create, accept/reject/counter-style status flow;
- meeting proposals da response status;
- callback requests;
- block/report-related controls.

Ya kamata a yi end-to-end test da accounts biyu kafin a ce chat ya kammala production verification.

### Business mode da public storefront

App ɗin yana da tsarin **account ɗaya, modes biyu: Personal da Business**. Business features sun haɗa da:

- business profile;
- public handle/storefront;
- business logo da details;
- business directory;
- business listings;
- team/delegated admin permissions;
- business verification workflow;
- shareable public mini-store.

Muhimmin bambanci: ƙirƙirar Business profile ba yana nufin an verified business ba. Verification yana da pending/approved-type workflow daban.

### Profile/account center

Profile yana da:

- personal information;
- my listings da tabs kamar active, pending, rejected, sold/drafts;
- seller statistics/analytics;
- recently viewed;
- saved searches;
- followers/following;
- notifications settings;
- privacy/security/appearance/language;
- business center;
- verification;
- payment history/subscription/boosting entries;
- blocked users da reports;
- terms, privacy, safety, prohibited items;
- account deletion flow.

Wasu pages kamar wallet ko support ana nuna su a matsayin unavailable/deferred idan backend ɗinsu bai cika ba, maimakon a yi kamar suna aiki.

### Admin/moderation

`AdminView.jsx` da migrations sun samar da controlled moderation center. Akwai:

- pending, approved, rejected queues;
- listing approval/rejection;
- rejection reason;
- moderation event/audit record;
- seller notification bayan moderation;
- edit & resubmit na rejected listing;
- admin team permissions;
- ad campaign/admin operations;
- protected RPCs da role checks.

Owner/admin access yana da kariya ta database. Ordinary users ba su kamata su iya ba wa kansu admin role ba.

## 3. Database da security

Migrations sun fi 50, daga foundation har zuwa sabon listing-limit, owner-admin, business, chat, verification, public media, ad campaigns, notifications, da Nigeria-only marketplace changes.

### Muhimman tables/entities da aka gano

- `profiles`
- `profile_contacts`
- `categories`
- `category_fields`
- `listings`
- `listing_media`
- `listing_favorites`
- `listing_drafts`
- `conversations`
- `conversation_participants`
- `messages`
- `reviews`
- `notifications`
- `listing_moderation_events`
- payment/subscription/entitlement tables
- business profile da verification tables
- offers da meeting/deal workflow tables
- follows, reports, callbacks, recently-viewed da ad campaign tables

### Row Level Security

An tsara RLS domin:

- public ya ga approved/active public listings kawai;
- user ya sarrafa profile/contact/listings/drafts/favorites nasa kawai;
- conversations da messages su kasance participant-scoped;
- notifications su kasance recipient-scoped;
- verification documents su kasance private ga owner da authorized moderator;
- admin actions su bi protected RPC/role checks;
- media upload path ya tabbatar da ownership.

Wannan kyakkyawan tsari ne. Amma kasancewar migration file a GitHub kaɗai ba hujja ba ce cewa duk migrations sun shiga production Supabase; ana bukatar a tabbatar da su a dashboard/project ɗin kai tsaye.

## 4. Payments da monetization

Current source ba ya da buyer checkout, amma yana da Paystack integration don seller-side monetization:

- seller plans/subscriptions;
- payment initialization;
- payment verification;
- webhook signature verification;
- payment transaction records;
- entitlement/free-post limits;
- listing boost packages;
- boost fulfillment/status.

Server code yana amfani da `SUPABASE_SERVICE_ROLE_KEY` da `PAYSTACK_SECRET_KEY` a server-side kawai. `.env.example` yana nuna su a matsayin placeholders; ba a gano secret mai aiki a tracked source ba.

### Abin da babu tukuna

- cart;
- buyer order table/workflow;
- checkout address;
- buyer purchase payment;
- delivery tracking;
- refund/cancellation policy workflow;
- seller order queue;
- escrow ko dispute settlement.

Saboda haka a UI/marketing, a fi amfani da **Request to buy** ko **Chat to buy**, ba **Buy now** ko **Checkout** ba har sai an gina wannan layer.

## 5. Abubuwan da aka tabbatar a wannan bincike

| Gwaji | Sakamako |
|---|---|
| `npm ci --no-audit --no-fund` | Passed |
| `npm run build` | Passed |
| Vite modules transformed | 1,861 modules |
| Production dist generated | Yes |
| Git branch | `main` clean, aligned with origin |
| Live Vercel response | HTTP 200 |
| Live server | Vercel |
| Tracked secrets found | No active secret; only env names/validation code |

Build output ya samar da code splitting na `SellView`, `AdminView`, `ProfileView`, da main bundle. Wannan yana taimaka wa loading, ko da yake babban CSS/JS bundle har yanzu yana da girma kuma ya kamata a ci gaba da optimization don mobile.

## 6. Manyan matsalolin da ya kamata a kula da su

### A. Production configuration

A tabbatar cewa production Vercel environment yana da:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`;
- Paystack server secrets a secret environment kawai;
- plan codes da callback/webhook configuration;
- migrations duka a production Supabase;
- buckets, Storage policies, Realtime, da Auth settings.

### B. Canonical domain

A code/docs akwai references zuwa `bese26.shop` da kuma `bese26-app.vercel.app`. A zaɓi domain ɗaya sannan a daidaita:

- public storefront URLs;
- auth redirect/site URL;
- Paystack callback;
- sitemap/SEO/canonical metadata;
- social sharing links.

### C. Auth/email

Custom Gmail SMTP ya taɓa bada authentication error a tsohon audit. Current email/password flow yana bukatar fresh-account smoke test: signup, email confirmation, redirect, login, logout, da password recovery.

### D. Chat verification

A yi test da real buyer da seller accounts guda biyu. A tabbatar message insert, Realtime delivery, read state/notifications, block behavior, attachments, offer, da meeting workflow.

### E. Moderation operations

Backend protected ne, amma a yi controlled test na:

1. seller ya submit listing;
2. admin ya ga pending;
3. admin ya reject da reason;
4. seller ya ga notification/reason;
5. seller ya edit & resubmit;
6. admin ya approve;
7. listing ta bayyana public.

### F. Legal/support copy

Terms, Privacy, Safety, da Prohibited Items pages suna nan, amma a tabbatar final legal text ɗin ya samu duba na ƙwararre. Support workflow ma ya kamata ya zama a sarari: ticket system ko a nuna cewa contact support bai haɗu da backend ba.

## 7. Abubuwan da bai kamata a ƙara ba tukuna

Kada a ƙara manyan abubuwa kamar cart/escrow/withdrawal ko live AI kafin a tabbatar da current core journey. Mafi muhimmanci yanzu shi ne:

1. production Supabase/Vercel configuration;
2. three-account smoke test: buyer, seller, admin;
3. Auth/email confirmation;
4. listing upload/moderation/resubmission;
5. two-user chat/Reatime;
6. business storefront/share links;
7. security/RLS and Storage verification;
8. performance/mobile checks.

## 8. Shawarar mataki na gaba

### Release 1 — Operational beta

A kammala production configuration, a tabbatar da duk migrations, a daidaita canonical domain, sannan a yi cikakken buyer/seller/admin test.

### Release 2 — Usability

A ƙara first-visit choice na “Ina son saya” ko “Ina son sayarwa”, a sauƙaƙa Profile, a ƙara contextual signup message, clearer listing status, loading skeletons, da better error states.

### Release 3 — Trust and scale

A ƙara support tickets, stronger moderation/appeals, SEO/Open Graph per storefront, image optimization, error monitoring, da privacy-conscious analytics.

### Release 4 — Buyer ordering

Sai bayan chat-first flow ya tabbata, a gina Stage 1 **Request to buy**, sannan Stage 2 verified checkout da Paystack order payments. A ware order/payment records daga seller subscription payments.

## Kammalawa

Bese26 yanzu **marketplace MVP mai ƙarfi ne**, ba fake UI kawai ba. Core discovery, listing, seller profile, business store, chat, trust, moderation, verification, da seller monetization layers suna cikin repository. Production build ya wuce, live deployment yana amsawa, kuma security architecture ɗin yana da kyakkyawar hanya.

Babban abin da ya rage ba wai gyaran basic UI ba ne; shi ne **production verification da operational discipline**: a tabbatar da migrations/configuration, a gwada real user journeys guda uku, a daidaita domain/email, sannan a yanke hukunci kan buyer ordering. A yanzu app ɗin ya dace da **local conversation-led marketplace beta**, amma kada a tallata shi a matsayin cikakken online shopping/checkout platform tukuna.
