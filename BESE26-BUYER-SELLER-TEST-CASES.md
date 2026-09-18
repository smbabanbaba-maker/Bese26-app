# Bese26 Buyer da Seller Soft-Launch Test Cases

## Yadda ake amfani da wannan document

Kowane tester ya yi amfani da account na test kawai, ba account ɗin da yake amfani da shi wajen muhimman bayanai ba. A kowanne test case a rubuta `PASS`, `FAIL`, ko `BLOCKED`. Idan ya fadi, a saka screenshot, lokaci, device, browser, account type, da matakan da aka bi kafin error ya fito.

Kada buyer ya yi amfani da seller account a test ɗaya. A raba test accounts domin a iya tabbatar da permissions da privacy daidai.

## Test data da ake buƙata

| Abu | Buyer test data | Seller test data |
|---|---|---|
| Email | buyer-test-01@example.com | seller-test-01@example.com |
| Account | Sabon account mara listings | Sabon account mai business option |
| Device | Android ko iPhone | Android ko desktop |
| Browser | Chrome ko Safari | Chrome ko Edge |
| Listing image | Hoto na test wanda ba shi da personal information | 2 zuwa 4 hotuna masu kyau |
| Location | Nigeria state da LGA na test | Nigeria state da LGA na test |
| Payment | Paystack test mode idan yana kunne | Paystack test mode idan yana kunne |

> Kada a saka real password, real government ID, ko real card details a cikin test report.

# A. Buyer test cases

## A1. Account da onboarding

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| B-001 | Buɗe app | Buɗe production URL a Chrome/Safari | Homepage ya buɗe ba tare da blank screen ko console-breaking error ba | ☐ |
| B-002 | Duba bottom navigation | Duba Home, Notifications, Saved, Sell, Messages, Business, Profile | Duk labels da icons sun bayyana, ba su hade ko overflow ba | ☐ |
| B-003 | Create account | Danna sign up, saka test email, password, display name da username | Account ya ƙirƙiru ko an nuna email confirmation state daidai | ☐ |
| B-004 | Email confirmation | Buɗe confirmation email idan an kunna shi | Link ya koma canonical Bese26 domain kuma account ya shiga | ☐ |
| B-005 | Login | Fita, sake shiga da test account | Session ya dawo ba tare da kuskure ba | ☐ |
| B-006 | Wrong password | Saka password mara kyau | An nuna error mai fahimta, ba a nuna database details ba | ☐ |
| B-007 | Password reset | Danna Forgot password, saka test email | Reset email ya tafi ko an nuna correct status | ☐ |
| B-008 | Logout | Danna logout | An fita, private pages sun koma sign-in prompt | ☐ |

## A2. Discover da search

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| B-009 | Browse listings | Buɗe Home ka duba product cards | Cards suna nuna title, price, image, location, seller da badge idan ya dace | ☐ |
| B-010 | Search title | Saka kalmar da take cikin listing | Relevant listings sun fito | ☐ |
| B-011 | Search no result | Saka kalma mara matching listing | Empty state ya fito da clear message da hanyar clear filters | ☐ |
| B-012 | Category filter | Zaɓi category ɗaya | Listings sun rage zuwa category ɗin da aka zaɓa | ☐ |
| B-013 | State/LGA filter | Zaɓi Nigeria state da LGA | Results sun dace da location, dropdown ba ya overflow a mobile | ☐ |
| B-014 | Verified filter | Kunna Verified only | Verified sellers/businesses kawai sun fito | ☐ |
| B-015 | Location permission denied | Ƙi browser location permission | App ya ci gaba da aiki da message mai fahimta | ☐ |
| B-016 | Mobile scroll | Yi amfani da waya ka scroll Home da Search | Babu horizontal overflow ko rubutu mai haɗuwa | ☐ |

## A3. Listing details da seller trust

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| B-017 | Open listing | Danna product card | Listing detail ya buɗe da title, images, price, condition, location, description | ☐ |
| B-018 | Listing gallery | Danna images ko thumbnails | Hoton da aka zaɓa ya bayyana daidai | ☐ |
| B-019 | Similar listings | Gungura ƙasa a detail page | Similar listings suna bayyana da images, ba sunaye kawai ba | ☐ |
| B-020 | Seller profile | Danna seller/business name | Public profile ko Miniweb ya buɗe | ☐ |
| B-021 | Verified badge | Buɗe verified seller/business | Blue verification tick yana kusa da sunan, ba a bayan sunan ba | ☐ |
| B-022 | Unverified account | Buɗe unverified profile | Ba a nuna verified tick ba | ☐ |
| B-023 | Share listing | Danna share | Native share ya buɗe ko link ya copy | ☐ |
| B-024 | Report listing | Danna report, zaɓi reason, submit | Report ya tafi, an nuna success message, seller bai ga private moderation details ba | ☐ |

## A4. Save, follow, chat, da contact

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| B-025 | Save listing | Danna save/heart | Icon ya canza, listing ya shiga Saved | ☐ |
| B-026 | Remove saved listing | Danna heart kuma | Listing ya fita daga Saved | ☐ |
| B-027 | Follow seller | Danna Follow a seller Miniweb | Button ya koma Following, follower count ya ƙaru | ☐ |
| B-028 | Unfollow seller | Danna Following | Button ya koma Follow, count ya ragu | ☐ |
| B-029 | Public follow counts | Buɗe Miniweb ba tare da login ba | Followers, Following, da public people lists sun bayyana idan akwai data | ☐ |
| B-030 | Send message | Danna message seller, aika test text | Message ya tafi, conversation ya bayyana | ☐ |
| B-031 | Empty message | Gwada aika blank message | App ya hana empty message kuma ya nuna guidance | ☐ |
| B-032 | WhatsApp/call preference | Buɗe listing mai contact buttons | Buttons suna bin seller preference, ba a nuna wanda seller ya ɓoye ba | ☐ |
| B-033 | Notification | Seller ya amsa ko ya tura update | Buyer ya samu notification ko notification refresh | ☐ |

## A5. Buyer safety da privacy

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| B-034 | Private route while logged out | Fita, buɗe Saved ko Messages | An nuna sign-in prompt, ba private data ba | ☐ |
| B-035 | Seller data isolation | Buyer A ya buɗe account na Buyer B | Ba zai ga draft, private contact, ko private documents ba | ☐ |
| B-036 | Block seller | Yi block idan feature yana cikin Profile | Seller ba zai fara sabon conversation ba | ☐ |
| B-037 | Report user | Submit user report | Report ya shiga moderation flow ba tare da fallasa bayanan reporter ba | ☐ |
| B-038 | Browser refresh | Refresh a listing da Miniweb route | Page ya dawo daidai ba tare da 404 ba | ☐ |

# B. Seller test cases

## B1. Seller profile

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| S-001 | Seller signup | Ƙirƙiri seller test account | Account ya ƙirƙiru kuma ya shiga app | ☐ |
| S-002 | Edit profile | Saka display name, bio, state, LGA, avatar | Bayan save, bayanai sun dawo bayan refresh | ☐ |
| S-003 | Avatar upload | Ɗora JPG/PNG image | Avatar ya bayyana a profile da public surfaces | ☐ |
| S-004 | Invalid avatar | Ɗora unsupported file ko file mai girma | App ya ƙi file da clear error | ☐ |
| S-005 | Public profile | Buɗe `/@username` a incognito | Public profile ya buɗe da public data kawai | ☐ |
| S-006 | Profile follow section | Duba public profile | Followers, Following, names, avatars, da verification status sun bayyana daidai | ☐ |

## B2. Listing creation

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| S-007 | Open Sell | Danna Sell daga bottom nav | Sell page ya buɗe, form bai yanke ba | ☐ |
| S-008 | Auth guard | Fita, danna Sell | Sign-in prompt ya fito | ☐ |
| S-009 | Required fields | Submit form babu title/price/category | App ya hana submit ya nuna fields da ake buƙata | ☐ |
| S-010 | Create basic listing | Saka title, description, price, category, condition, location | Listing ya adana ko ya zama draft daidai | ☐ |
| S-011 | Nigerian location | Zaɓi state da LGA | LGA options sun dace da state, country Nigeria ne | ☐ |
| S-012 | Currency | Saka price | Currency ta bayyana daidai, ba a rikita NGN da wani currency ba | ☐ |
| S-013 | Upload one image | Ɗora listing image | Preview ya bayyana, upload ya kammala | ☐ |
| S-014 | Upload multiple images | Ɗora hotuna 2 zuwa 4 | Gallery order da images suna aiki | ☐ |
| S-015 | Invalid listing image | Ɗora unsupported file ko file mai girma | App ya ƙi file da clear message | ☐ |
| S-016 | Save draft | Cika wani ɓangare ka adana draft | Draft ya bayyana a seller listings/drafts | ☐ |
| S-017 | Resume draft | Buɗe draft ka ci gaba | Data da aka adana ta dawo ba tare da ɓacewa ba | ☐ |
| S-018 | Publish listing | Submit complete listing | Listing ya shiga moderation ko active status bisa setup | ☐ |
| S-019 | Edit listing | Canza price/description/image | Sabon value ya dawo bayan refresh | ☐ |
| S-020 | Pause listing | Saita listing zuwa paused | Listing ya fita daga public search amma yana nan ga seller | ☐ |
| S-021 | Delete listing | Delete test listing | Listing ya fita daga public view; a tabbatar warning ya bayyana kafin delete | ☐ |

## B3. Business Miniweb

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| S-022 | Open Business Center | Danna Business | Business profile form ya buɗe | ☐ |
| S-023 | Save business | Saka name, handle, category, description, state, LGA | Business profile ya adana daidai | ☐ |
| S-024 | Handle validation | Gwada handle mara kyau ko wanda aka riga aka ɗauka | App ya hana duplicate/invalid handle | ☐ |
| S-025 | Business logo | Ɗora logo | Logo ya bayyana a Miniweb da directory | ☐ |
| S-026 | Public Miniweb | Buɗe `/@business-handle` ba tare da login ba | Miniweb ya buɗe da name, logo, location, about, listings | ☐ |
| S-027 | Business verification badge | Buɗe verified business | Tick yana kusa da business name kuma yana da correct color | ☐ |
| S-028 | Miniweb listings | Sanya listing a matsayin business listing | Listing ya bayyana a Miniweb da public detail | ☐ |
| S-029 | Follow business | Buyer ya follow business | Following state da count sun canza, notification logic ba ta karya ba | ☐ |
| S-030 | Share Miniweb | Danna share | Public link ya copy ko native share ya buɗe | ☐ |
| S-031 | Mobile Miniweb | Buɗe a 320px–430px viewport | Babu overlap, horizontal scroll, ko clipped business name | ☐ |

## B4. KYC da verification

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| S-032 | Open KYC | Buɗe verification section | KYC ba paywall ba ne ga seller | ☐ |
| S-033 | Seller verification draft | Cika form ka save draft | Draft ya adana ba tare da approval ba | ☐ |
| S-034 | Submit KYC | Ɗora required data/document ka submit | Status ya zama pending/pending review | ☐ |
| S-035 | Document privacy | Gwada public URL na KYC document | Ba a iya buɗe document ba tare da authorized access ba | ☐ |
| S-036 | Admin approval | Admin ya approve test KYC | Profile/business `is_verified` ya koma true | ☐ |
| S-037 | Badge visibility | Refresh public profile bayan approval | Blue tick ya bayyana kusa da sunan | ☐ |
| S-038 | Admin rejection | Admin ya reject da dalili | Seller ya ga status/reviewer note da ya dace, badge bai bayyana ba | ☐ |
| S-039 | Request information | Admin ya request info | Seller zai iya gyara/resubmit bayan an nuna abin da ake buƙata | ☐ |

## B5. Seller communication da business operations

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| S-040 | Receive buyer message | Buyer ya aika message | Seller ya samu conversation da notification | ☐ |
| S-041 | Reply message | Seller ya amsa | Buyer ya samu reply da realtime/refresh | ☐ |
| S-042 | Chat attachment | Aika test image a chat idan yana kunne | Attachment ya upload, ya bayyana ga participants kawai | ☐ |
| S-043 | Offer | Buyer ya tura offer | Seller ya ga offer da amount/status | ☐ |
| S-044 | Accept/reject offer | Seller ya canza offer status | Buyer ya ga sabon status | ☐ |
| S-045 | Meeting proposal | Create test meeting | Meeting date/time/area sun bayyana ga participants | ☐ |
| S-046 | Callback request | Buyer ya nemi callback | Seller ya ga request kuma zai iya canza status | ☐ |

# C. Cross-account verification

| ID | Gwaji | Matakai | Expected result | Status |
|---|---|---|---|---|
| X-001 | Buyer sees seller listing | Seller ya publish, Buyer ya search | Listing ya bayyana da correct seller name | ☐ |
| X-002 | Buyer follows seller | Buyer ya follow seller | Seller profile follower count ya ƙaru | ☐ |
| X-003 | Seller cannot see buyer private data | Seller ya buɗe buyer profile | Seller yana ganin public fields kawai | ☐ |
| X-004 | Buyer cannot access seller draft | Buyer ya gwada draft URL idan ya samu | Access ya ƙi, babu draft content | ☐ |
| X-005 | Admin action audit | Admin ya approve/reject test item | Decision note, actor, timestamp suna cikin audit path | ☐ |
| X-006 | Refresh persistence | Yi refresh bayan follow, save, listing publish, KYC status | State ya dawo daga database, ba local fake state ba | ☐ |
| X-007 | Logout isolation | Logout Seller, login Buyer a browser ɗaya | Seller data ba ta bayyana a Buyer session ba | ☐ |
| X-008 | Multi-device view | Buɗe same public listing a mobile da desktop | Content ya yi daidai, layout kawai ya canza | ☐ |

# D. Final acceptance rules

A ɗauki Buyer/Seller soft launch a matsayin **PASS** idan:

- Buyer ya kammala signup, search, save, follow, message, da public Miniweb ba tare da P0 ko P1 ba.
- Seller ya kammala profile, listing creation, upload, publish, edit, da pause/delete test.
- Business owner ya kammala Miniweb creation da public storefront test.
- KYC document ya kasance private, kuma verified badge yana bayyana ne kawai bayan approval.
- Follow counts da follower/following lists suna dawo daga Supabase bayan refresh.
- Babu private data leakage tsakanin Buyer, Seller, da Admin.
- Mobile layout ba ya da horizontal overflow ko rubutu da ya hade.
- Duk failed tests suna da issue ID, screenshot, da reproduction steps.

A sanya test a matsayin **BLOCKED** idan environment, migration, payment provider, email provider, ko missing permission ya hana gwaji. Kada a ɗauki `BLOCKED` a matsayin `PASS`.

## Tester sign-off

| Rukuni | Tester | Device/browser | Kwanan wata | Pass count | Fail count | Blocked count | Sa hannu |
|---|---|---|---|---:|---:|---:|---|
| Buyer |  |  |  |  |  |  |  |
| Seller |  |  |  |  |  |  |  |
| Business owner |  |  |  |  |  |  |  |
| Admin verification |  |  |  |  |  |  |  |
