import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export const LOCALES = [
  { code: 'en', label: 'English', native: 'English', flag: 'EN' },
  { code: 'ha', label: 'Hausa', native: 'Hausa', flag: 'HA' },
  { code: 'pcm', label: 'Pidgin', native: 'Pidgin', flag: 'PG' },
  { code: 'yo', label: 'Yorùbá', native: 'Yorùbá', flag: 'YO' },
  { code: 'ig', label: 'Igbo', native: 'Igbo', flag: 'IG' },
];

const common = {
  Shop: 'Shop', Nigeria: 'Nigeria', Search: 'Search', Home: 'Home', Notifications: 'Notifications', Saved: 'Saved', Sell: 'Sell', Messages: 'Messages', Profile: 'Profile',
  'Choose language': 'Choose language', 'Search listings': 'Search listings', 'I am looking for…': 'I am looking for…', 'Find listings': 'Find listings',
  'How to sell': 'How to sell', 'How to buy': 'How to buy', 'Explore shops': 'Explore shops', 'List an item': 'List an item',
  'CHOOSE A CATEGORY': 'CHOOSE A CATEGORY', 'What are you looking for?': 'What are you looking for?', 'Find trusted products, services, and businesses near you.': 'Find trusted products, services, and businesses near you.',
  'View all': 'View all', 'HOT OFFERS': 'HOT OFFERS', 'Trending deals': 'Trending deals', 'Popular picks buyers are checking out now.': 'Popular picks buyers are checking out now.',
  'CURATED FOR YOU': 'CURATED FOR YOU', 'Featured listings': 'Featured listings', 'Fresh picks for you': 'Fresh picks for you', 'New picks appear here': 'New picks appear here',
  Phones: 'Phones', Cars: 'Cars', Property: 'Property', Fashion: 'Fashion', Agriculture: 'Agriculture', Services: 'Services', Food: 'Food', Businesses: 'Businesses',
  'Verified sellers': 'Verified sellers', 'Check seller badges before you chat': 'Check seller badges before you chat', 'Chat to buy': 'Chat to buy', 'Ask questions before meeting': 'Ask questions before meeting', 'Find nearby': 'Find nearby', 'Discover listings by location': 'Discover listings by location',
  'Loading the newest listings…': 'Loading the newest listings…', 'No live listings yet': 'No live listings yet', 'Be one of the first sellers to add a product. New listings appear here after review.': 'Be one of the first sellers to add a product. New listings appear here after review.',
  'Explore businesses': 'Explore businesses', 'View all listings': 'View all listings', 'Browse listings': 'Browse listings', 'Find what you need quickly.': 'Find what you need quickly.', results: 'results', All: 'All', Recommended: 'Recommended', Newest: 'Newest', 'Price low → high': 'Price low → high', 'Price high → low': 'Price high → low', 'Verified only': 'Verified only', 'Clear filters': 'Clear filters',
  Save: 'Save', 'Save listing': 'Save listing', 'Remove from saved': 'Remove from saved', Back: 'Back', Close: 'Close', Cancel: 'Cancel', Continue: 'Continue', Submit: 'Submit', Refresh: 'Refresh', Loading: 'Loading…', 'Sign in': 'Sign in', 'Create account': 'Create account', Logout: 'Logout', Settings: 'Settings',
  'Language & Region': 'Language & Region', 'Interface language': 'Interface language', Currency: 'Currency', 'Date format': 'Date format', Preferences: 'Preferences', Appearance: 'Appearance', 'Dark mode': 'Dark mode', 'Light mode': 'Light mode',
  'Account Center': 'Account Center', 'All updates': 'All updates', Unread: 'Unread', 'No notifications yet': 'No notifications yet', 'You are all caught up': 'You are all caught up', 'Stay informed about your listings, messages, payments, and account activity.': 'Stay informed about your listings, messages, payments, and account activity.',
  'My Listings': 'My Listings', 'Saved Items': 'Saved Items', Drafts: 'Drafts', 'Sold Items': 'Sold Items', 'Seller Analytics': 'Seller Analytics', 'Personal Information': 'Personal Information', 'Login & Security': 'Login & Security', 'Help Center': 'Help Center', 'Safety Center': 'Safety Center',
  'Add listing': 'Add listing', 'Manage listings': 'Manage listings', 'Choose a language': 'Choose a language', 'Language selection is stored in your Bese26 account.': 'Your language choice is saved to your Bese26 account.', 'Preference saved.': 'Preference saved.',
  'Your experience': 'Your experience', 'Make it yours': 'Make it yours', 'Alerts & updates': 'Alerts & updates', 'Stay in the loop': 'Stay in the loop', 'Privacy & contact': 'Privacy & contact', 'Control your visibility': 'Control your visibility',
  'Personal control center': 'Personal control center', 'Personalize your Bese26 experience.': 'Personalize your Bese26 experience.', 'Manage your theme, language, alerts, privacy and buyer communication in one place.': 'Manage your theme, language, alerts, privacy and buyer communication in one place.', Saved: 'Saved', 'settings': 'settings',
  'Choose the language you want to use across Bese26.': 'Choose the language you want to use across Bese26.', 'Your selection updates the whole app immediately.': 'Your selection updates the whole app immediately.', 'App language': 'App language', 'Saved to your account': 'Saved to your account', 'Only Nigeria and NGN are currently supported.': 'Only Nigeria and NGN are currently supported.',
  'Nigerian online marketplace for buying and selling.': 'Nigerian online marketplace for buying and selling.', Terms: 'Terms', Privacy: 'Privacy', Refunds: 'Refunds', Safety: 'Safety',
};

const translations = {
  en: common,
  ha: {
    ...common, Shop: 'Shago', Home: 'Gida', Search: 'Nema', Sell: 'Sayar', Messages: 'Saƙonni', Notifications: 'Sanarwa', Profile: 'Bayanan kai', Saved: 'Ajiye',
    'Choose language': 'Zaɓi harshe', 'Search listings': 'Nemo tallace-tallace', 'I am looking for…': 'Ina neman…', 'Find listings': 'Nemo tallace-tallace',
    'How to sell': 'Yadda ake sayarwa', 'How to buy': 'Yadda ake saye', 'Explore shops': 'Duba shaguna', 'List an item': 'Sanya kaya',
    'CHOOSE A CATEGORY': 'ZAƁI RUKUNI', 'What are you looking for?': 'Me kake nema?', 'Find trusted products, services, and businesses near you.': 'Nemo amintattun kaya, ayyuka, da kasuwanci kusa da kai.',
    'View all': 'Duba duka', 'HOT OFFERS': 'KAYAN DA AKE SO', 'Trending deals': 'Kasuwanni masu tashe', 'Popular picks buyers are checking out now.': 'Abubuwan da masu saye ke dubawa yanzu.',
    'CURATED FOR YOU': 'AN ZAƁA MAKA', 'Featured listings': 'Tallace-tallacen da aka zaɓa', 'Fresh picks for you': 'Sabbin zaɓuɓɓuka gare ka', 'New picks appear here': 'Sabbin zaɓuɓɓuka za su bayyana a nan',
    Phones: 'Wayoyi', Cars: 'Motoci', Property: 'Gidaje', Fashion: 'Kayan sawa', Agriculture: 'Noma', Services: 'Ayyuka', Food: 'Abinci', Businesses: 'Kasuwanci',
    'Verified sellers': 'Amintattun masu sayarwa', 'Check seller badges before you chat': 'Duba alamun mai sayarwa kafin hira', 'Chat to buy': 'Yi hira domin saya', 'Ask questions before meeting': 'Yi tambayoyi kafin haɗuwa', 'Find nearby': 'Nemo kusa', 'Discover listings by location': 'Nemo tallace-tallace ta wuri',
    'Loading the newest listings…': 'Ana lodin sabbin tallace-tallace…', 'No live listings yet': 'Babu tallace-tallace a halin yanzu', 'Be one of the first sellers to add a product. New listings appear here after review.': 'Zama cikin farkon masu sayarwa da za su ƙara kaya. Sabbin tallace-tallace za su bayyana bayan dubawa.',
    'Explore businesses': 'Duba kasuwanci', 'View all listings': 'Duba duk tallace-tallace', 'Browse listings': 'Duba tallace-tallace', 'Find what you need quickly.': 'Nemo abin da kake buƙata cikin sauri.', results: 'sakamako', All: 'Duka', Recommended: 'Shawarar da ta dace', Newest: 'Sabbi', 'Price low → high': 'Farashi daga ƙasa zuwa sama', 'Price high → low': 'Farashi daga sama zuwa ƙasa', 'Verified only': 'Amintattu kawai', 'Clear filters': 'Share tacewa',
    Save: 'Ajiye', 'Save listing': 'Ajiye talla', 'Remove from saved': 'Cire daga ajiyewa', Back: 'Koma', Close: 'Rufe', Cancel: 'Soke', Continue: 'Ci gaba', Submit: 'Tura', Refresh: 'Sabunta', Loading: 'Ana lodawa…', 'Sign in': 'Shiga', 'Create account': 'Ƙirƙiri asusu', Logout: 'Fita', Settings: 'Saituna',
    'Language & Region': 'Harshe da Yanki', 'Interface language': 'Harshen manhaja', Currency: 'Kuɗi', 'Date format': 'Tsarin kwanan wata', Preferences: 'Zaɓuɓɓuka', Appearance: 'Siffa', 'Dark mode': 'Yanayin duhu', 'Light mode': 'Yanayin haske',
    'Account Center': 'Cibiyar Asusu', 'All updates': 'Dukkan sabuntawa', Unread: 'Ba a karanta ba', 'No notifications yet': 'Babu sanarwa tukuna', 'You are all caught up': 'Ka gama karanta komai', 'Stay informed about your listings, messages, payments, and account activity.': 'Kasance da masaniya kan tallace-tallacenka, saƙonni, biyan kuɗi, da ayyukan asusu.',
    'My Listings': 'Tallace-tallacena', 'Saved Items': 'Abubuwan da aka ajiye', Drafts: 'Abubuwan da ba a gama ba', 'Sold Items': 'Abubuwan da aka sayar', 'Seller Analytics': 'Bayanan mai sayarwa', 'Personal Information': 'Bayanan kai', 'Login & Security': 'Shiga da tsaro', 'Help Center': 'Cibiyar taimako', 'Safety Center': 'Cibiyar tsaro',
    'Add listing': 'Ƙara talla', 'Manage listings': 'Sarrafa tallace-tallace', 'Choose a language': 'Zaɓi harshe', 'Language selection is stored in your Bese26 account.': 'Ana adana zaɓin harshenka a asusun Bese26.', 'Preference saved.': 'An adana zaɓi.',
    'Your experience': 'Kwarewarka', 'Make it yours': 'Saita yadda kake so', 'Alerts & updates': 'Sanarwa da sabuntawa', 'Stay in the loop': 'Kasance cikin sani', 'Privacy & contact': 'Sirri da tuntuɓa', 'Control your visibility': 'Sarrafa abin da ake gani',
    'Personal control center': 'Cibiyar sarrafa kanka', 'Personalize your Bese26 experience.': 'Saita Bese26 yadda kake so.', 'Manage your theme, language, alerts, privacy and buyer communication in one place.': 'Sarrafa siffa, harshe, sanarwa, sirri da sadarwa da masu saye a wuri ɗaya.', 'settings': 'saituna',
    'Choose the language you want to use across Bese26.': 'Zaɓi harshen da kake son amfani da shi a duk Bese26.', 'Your selection updates the whole app immediately.': 'Zaɓinka zai sabunta dukkan app nan take.', 'App language': 'Harshen app', 'Saved to your account': 'An adana a asusunka', 'Only Nigeria and NGN are currently supported.': 'A yanzu Nigeria da NGN kawai ake tallafawa.',
    'Nigerian online marketplace for buying and selling.': 'Kasuwar intanet ta Nigeria don saya da sayarwa.', Terms: 'Sharuɗɗa', Privacy: 'Sirri', Refunds: 'Mayar da kuɗi', Safety: 'Tsaro',
  },
  pcm: {
    ...common, Shop: 'Shop', Home: 'Home', Search: 'Search', Sell: 'Sell', Messages: 'Messages', Notifications: 'Notifications', Profile: 'Profile',
    'Choose language': 'Choose language', 'Search listings': 'Search listings', 'I am looking for…': 'I dey find…', 'Find listings': 'Find listings', 'How to sell': 'How to sell', 'How to buy': 'How to buy', 'Explore shops': 'Explore shops', 'List an item': 'List item',
    'CHOOSE A CATEGORY': 'CHOOSE CATEGORY', 'What are you looking for?': 'Wetin you dey find?', 'Find trusted products, services, and businesses near you.': 'Find trusted products, services and business around you.', 'View all': 'View all', 'HOT OFFERS': 'HOT OFFERS', 'Trending deals': 'Trending deals', 'Popular picks buyers are checking out now.': 'Wetins buyers dey check now.', 'CURATED FOR YOU': 'FOR YOU', 'Featured listings': 'Featured listings', 'Fresh picks for you': 'Fresh picks for you', 'New picks appear here': 'New picks go show here', Phones: 'Phones', Cars: 'Cars', Property: 'Property', Fashion: 'Fashion', Agriculture: 'Agriculture', Services: 'Services', Food: 'Food', Businesses: 'Businesses',
    'Verified sellers': 'Verified sellers', 'Check seller badges before you chat': 'Check seller badge before you chat', 'Chat to buy': 'Chat to buy', 'Ask questions before meeting': 'Ask questions before you meet', 'Find nearby': 'Find nearby', 'Discover listings by location': 'Find listings for your area', 'Loading the newest listings…': 'Loading new listings…', 'No live listings yet': 'No live listings yet', 'Explore businesses': 'Explore businesses', 'View all listings': 'View all listings', 'Browse listings': 'Browse listings', 'Find what you need quickly.': 'Find wetin you need quick.', results: 'results', All: 'All', Recommended: 'Recommended', Newest: 'Newest', 'Verified only': 'Verified only', 'Clear filters': 'Clear filters',
    Save: 'Save', 'Save listing': 'Save listing', 'Remove from saved': 'Remove from saved', Back: 'Back', Close: 'Close', Cancel: 'Cancel', Continue: 'Continue', Submit: 'Submit', Refresh: 'Refresh', Loading: 'Loading…', 'Sign in': 'Log in', 'Create account': 'Create account', Logout: 'Log out', Settings: 'Settings',
    'Language & Region': 'Language & Region', 'Interface language': 'App language', Currency: 'Currency', 'Date format': 'Date format', Preferences: 'Preferences', Appearance: 'Appearance', 'Dark mode': 'Dark mode', 'Light mode': 'Light mode', 'Account Center': 'Account Center', 'All updates': 'All updates', Unread: 'Unread', 'No notifications yet': 'No notifications yet', 'You are all caught up': 'You don catch up', 'Stay informed about your listings, messages, payments, and account activity.': 'Stay updated about your listings, messages, payments and account activity.', 'My Listings': 'My Listings', 'Saved Items': 'Saved Items', Drafts: 'Drafts', 'Sold Items': 'Sold Items', 'Seller Analytics': 'Seller Analytics', 'Personal Information': 'Personal Information', 'Login & Security': 'Login & Security', 'Help Center': 'Help Center', 'Safety Center': 'Safety Center', 'Add listing': 'Add listing', 'Manage listings': 'Manage listings', 'Choose a language': 'Choose a language', 'Language selection is stored in your Bese26 account.': 'We save your language choice to your Bese26 account.', 'Preference saved.': 'Preference saved.',
    'Your experience': 'Your experience', 'Make it yours': 'Make am yours', 'Alerts & updates': 'Alerts & updates', 'Stay in the loop': 'Stay updated', 'Privacy & contact': 'Privacy & contact', 'Control your visibility': 'Control wetin people see', 'Personal control center': 'Personal control center', 'Personalize your Bese26 experience.': 'Make Bese26 work for you.', 'Manage your theme, language, alerts, privacy and buyer communication in one place.': 'Manage your theme, language, alerts, privacy and buyer messages one place.', 'Choose the language you want to use across Bese26.': 'Choose the language you wan use for all Bese26.', 'Your selection updates the whole app immediately.': 'Your choice go update the whole app now.', 'App language': 'App language', 'Saved to your account': 'Saved to your account', 'Only Nigeria and NGN are currently supported.': 'For now na Nigeria and NGN we support.', 'Nigerian online marketplace for buying and selling.': 'Nigeria online marketplace for buying and selling.', Terms: 'Terms', Privacy: 'Privacy', Refunds: 'Refunds', Safety: 'Safety',
  },
  yo: {
    ...common, Shop: 'Ọjà', Home: 'Ilé', Search: 'Wá', Sell: 'Ta', Messages: 'Àwọn ìfiranṣẹ́', Notifications: 'Àwọn ìfitónilétí', Profile: 'Profaili', Saved: 'Ti fipamọ́',
    'Choose language': 'Yan èdè', 'Search listings': 'Wá àwọn ohun tí a ń tà', 'I am looking for…': 'Mo ń wá…', 'Find listings': 'Wá àwọn ohun tí a ń tà', 'How to sell': 'Bí a ṣe ń tà', 'How to buy': 'Bí a ṣe ń rà', 'Explore shops': 'Ṣàwárí àwọn ṣọ́ọ̀bù', 'List an item': 'Fi ohun kan sí', 'CHOOSE A CATEGORY': 'YAN Ẹ̀KA', 'What are you looking for?': 'Kí ni o ń wá?', 'Find trusted products, services, and businesses near you.': 'Wá àwọn ọja, iṣẹ́ àti òwò tí a lè gbẹ́kẹ̀lé lẹ́gbẹ̀ẹ́ rẹ.', 'View all': 'Wo gbogbo rẹ̀', 'HOT OFFERS': 'ÀWỌN ÀǸFÀÀNÍ GBÓNÁ', 'Trending deals': 'Àwọn àǹfààní tó ń lọ sókè', 'Popular picks buyers are checking out now.': 'Àwọn ohun tí àwọn oníbàárà ń wo báyìí.', 'CURATED FOR YOU': 'A YÀN FÚN Ẹ', 'Featured listings': 'Àwọn ohun tí a yàn', 'Fresh picks for you': 'Àwọn tuntun fún ẹ', 'New picks appear here': 'Àwọn tuntun máa hàn níbí', Phones: 'Fóònù', Cars: 'Ọkọ̀ ayọ́kẹ́lẹ́', Property: 'Ilé àti ilẹ̀', Fashion: 'Aṣọ', Agriculture: 'Iṣẹ́ àgbẹ̀', Services: 'Iṣẹ́', Food: 'Oúnjẹ', Businesses: 'Àwọn òwò', 'Verified sellers': 'Àwọn olùtajà tí a fìdí rẹ̀ múlẹ̀', 'Check seller badges before you chat': 'Ṣàyẹ̀wò àmì olùtajà kí o tó bá a sọ̀rọ̀', 'Chat to buy': 'Bá a sọ̀rọ̀ láti rà', 'Ask questions before meeting': 'Béèrè kí o tó pàdé', 'Find nearby': 'Wá nítòsí', 'Discover listings by location': 'Ṣàwárí nípa ibi', 'Loading the newest listings…': 'Ń gbé àwọn tuntun wọlé…', 'No live listings yet': 'Kò sí ohun tí a ń tà báyìí', 'Explore businesses': 'Ṣàwárí òwò', 'View all listings': 'Wo gbogbo ohun tí a ń tà', 'Browse listings': 'Ṣàwárí àwọn ohun tí a ń tà', 'Find what you need quickly.': 'Wá ohun tí o nílò kíákíá.', results: 'àbájáde', All: 'Gbogbo rẹ̀', Recommended: 'A ṣàdúrà', Newest: 'Tuntun jù', 'Verified only': 'Àwọn tí a fìdí rẹ̀ múlẹ̀ nìkan', 'Clear filters': 'Pa àlẹ̀ mọ́',
    Save: 'Fipamọ́', 'Save listing': 'Fipamọ́ ohun tí a ń tà', 'Remove from saved': 'Yọ kúrò nínú àwọn tí a fipamọ́', Back: 'Padà', Close: 'Pa', Cancel: 'Fagilé', Continue: 'Tẹ̀síwájú', Submit: 'Firanṣẹ́', Refresh: 'Tún ṣe', Loading: 'Ń gbé wọlé…', 'Sign in': 'Wọlé', 'Create account': 'Ṣẹ̀dá àkáǹtì', Logout: 'Jáde', Settings: 'Ètò', 'Language & Region': 'Èdè àti Agbègbè', 'Interface language': 'Èdè ìṣàfilọ́lẹ̀', Currency: 'Owó', 'Date format': 'Ìlànà ọjọ́', Preferences: 'Àwọn ààyò', Appearance: 'Ìrísí', 'Dark mode': 'Ìpo òkùnkùn', 'Light mode': 'Ìpo ìmọ́lẹ̀', 'Account Center': 'Àárín àkáǹtì', 'All updates': 'Gbogbo àtúnṣe', Unread: 'Kò tíì kà', 'No notifications yet': 'Kò sí ìfitónilétí síbẹ̀', 'You are all caught up': 'O ti ka gbogbo rẹ̀', 'Stay informed about your listings, messages, payments, and account activity.': 'Mọ̀ nípa àwọn ohun tí o ń tà, ìfiranṣẹ́, ìsanwó àti iṣẹ́ àkáǹtì rẹ.', 'My Listings': 'Àwọn ohun tí mo ń tà', 'Saved Items': 'Àwọn ohun tí a fipamọ́', Drafts: 'Àwọn àkọ́kọ́', 'Sold Items': 'Àwọn tí a tà', 'Seller Analytics': 'Àlàyé olùtajà', 'Personal Information': 'Àlàyé ara ẹni', 'Login & Security': 'Wíwọlé àti ààbò', 'Help Center': 'Ibi ìrànwọ́', 'Safety Center': 'Ibi ààbò', 'Add listing': 'Fi ohun kan sí', 'Manage listings': 'Ṣàkóso àwọn ohun tí o ń tà', 'Choose a language': 'Yan èdè', 'Language selection is stored in your Bese26 account.': 'A máa fi èdè tí o yàn pamọ́ sínú àkáǹtì Bese26 rẹ.', 'Preference saved.': 'A ti fipamọ́ ààyò.', 'Your experience': 'Ìrírí rẹ', 'Make it yours': 'Ṣètò rẹ', 'Alerts & updates': 'Àwọn ìfitónilétí àti àtúnṣe', 'Stay in the loop': 'Máa mọ̀ ohun tó ń ṣẹlẹ̀', 'Privacy & contact': 'Àṣírí àti ìbánisọ̀rọ̀', 'Control your visibility': 'Ṣàkóso ohun tí a rí', 'Personal control center': 'Àárín ìṣàkóso ara ẹni', 'Personalize your Bese26 experience.': 'Ṣètò iriri Bese26 rẹ.', 'Manage your theme, language, alerts, privacy and buyer communication in one place.': 'Ṣàkóso irisi, èdè, ìfitónilétí, àṣírí àti ìbánisọ̀rọ̀ pẹ̀lú àwọn oníbàárà níbi kan.', 'Choose the language you want to use across Bese26.': 'Yan èdè tí o fẹ́ lò káàkiri Bese26.', 'Your selection updates the whole app immediately.': 'Ohun tí o yàn máa yí gbogbo app padà lẹ́sẹ̀kẹsẹ̀.', 'App language': 'Èdè app', 'Saved to your account': 'A fipamọ́ sínú àkáǹtì rẹ', 'Only Nigeria and NGN are currently supported.': 'Nigeria àti NGN nìkan la ń ṣe àtìlẹ́yìn fún báyìí.', 'Nigerian online marketplace for buying and selling.': 'Ọjà orí ayélujára Nàìjíríà fún rira àti tita.', Terms: 'Àwọn òfin', Privacy: 'Àṣírí', Refunds: 'Ìpadà owó', Safety: 'Ààbò',
  },
  ig: {
    ...common, Shop: 'Ụlọ ahịa', Home: 'Ụlọ', Search: 'Chọọ', Sell: 'Ree', Messages: 'Ozi', Notifications: 'Ọkwa', Profile: 'Profaịlụ', Saved: 'Echekwara', 'Choose language': 'Họrọ asụsụ', 'Search listings': 'Chọọ ihe ndị a na-ere', 'I am looking for…': 'Ana m achọ…', 'Find listings': 'Chọọ ihe ndị a na-ere', 'How to sell': 'Otu esi ere', 'How to buy': 'Otu esi azụta', 'Explore shops': 'Chọpụta ụlọ ahịa', 'List an item': 'Tinye ihe ị na-ere', 'CHOOSE A CATEGORY': 'HỌRỌ ỤDỊ', 'What are you looking for?': 'Kedu ihe ị na-achọ?', 'Find trusted products, services, and businesses near you.': 'Chọta ngwaahịa, ọrụ na azụmahịa a pụrụ ịtụkwasị obi n’akụkụ gị.', 'View all': 'Lee ha niile', 'HOT OFFERS': 'NGWAỌRỤ ỌMA', 'Trending deals': 'Ihe ndị na-ewu ewu', 'Popular picks buyers are checking out now.': 'Ihe ndị na-azụ ahịa na-ele ugbu a.', 'CURATED FOR YOU': 'AHỌRỌRỌ GỊ', 'Featured listings': 'Ihe ndị ahọpụtara', 'Fresh picks for you': 'Ihe ọhụrụ maka gị', 'New picks appear here': 'Ihe ọhụrụ ga-apụta ebe a', Phones: 'Ekwentị', Cars: 'Ụgbọala', Property: 'Ụlọ na ala', Fashion: 'Uwe', Agriculture: 'Ọrụ ugbo', Services: 'Ọrụ', Food: 'Nri', Businesses: 'Azụmahịa', 'Verified sellers': 'Ndị na-ere a kwadoro', 'Check seller badges before you chat': 'Lelee akara onye na-ere tupu ị kparịta ụka', 'Chat to buy': 'Kparịta ụka zụta', 'Ask questions before meeting': 'Jụọ ajụjụ tupu nzukọ', 'Find nearby': 'Chọta ndị dị nso', 'Discover listings by location': 'Chọpụta ihe site n’ebe', 'Loading the newest listings…': 'Na-ebunye ihe ọhụrụ…', 'No live listings yet': 'Ọ dịghị ihe a na-ere ugbu a', 'Explore businesses': 'Chọpụta azụmahịa', 'View all listings': 'Lee ihe niile a na-ere', 'Browse listings': 'Chọgharịa ihe ndị a na-ere', 'Find what you need quickly.': 'Chọta ihe ị chọrọ ngwa ngwa.', results: 'nsonaazụ', All: 'Ha niile', Recommended: 'A tụrụ aro', Newest: 'Kacha ọhụrụ', 'Verified only': 'Ndị a kwadoro naanị', 'Clear filters': 'Kpochapụ nzacha', Save: 'Chekwaa', 'Save listing': 'Chekwaa ihe a na-ere', 'Remove from saved': 'Wepụ n’ihe echekwara', Back: 'Laghachi', Close: 'Mechie', Cancel: 'Kagbuo', Continue: 'Gaa n’ihu', Submit: 'Zipụ', Refresh: 'Melite', Loading: 'Na-ebunye…', 'Sign in': 'Banye', 'Create account': 'Mepụta akaụntụ', Logout: 'Pụọ', Settings: 'Ntọala', 'Language & Region': 'Asụsụ na Mpaghara', 'Interface language': 'Asụsụ ngwa', Currency: 'Ego', 'Date format': 'Ụdị ụbọchị', Preferences: 'Nhọrọ', Appearance: 'Ọdịdị', 'Dark mode': 'Ọnọdụ ọchịchịrị', 'Light mode': 'Ọnọdụ ìhè', 'Account Center': 'Ebe Akaụntụ', 'All updates': 'Mmelite niile', Unread: 'Agụbeghị', 'No notifications yet': 'Ọkwa adịghị ugbu a', 'You are all caught up': 'Ị gụchala ihe niile', 'Stay informed about your listings, messages, payments, and account activity.': 'Nọgide na-amata maka ihe ị na-ere, ozi, ịkwụ ụgwọ na ọrụ akaụntụ gị.', 'My Listings': 'Ihe m na-ere', 'Saved Items': 'Ihe echekwara', Drafts: 'Ihe ndị a na-ede', 'Sold Items': 'Ihe e rere', 'Seller Analytics': 'Nchịkọta onye na-ere', 'Personal Information': 'Ozi nke onwe', 'Login & Security': 'Banye na nchekwa', 'Help Center': 'Ebe enyemaka', 'Safety Center': 'Ebe nchekwa', 'Add listing': 'Tinye ihe ị na-ere', 'Manage listings': 'Jikwaa ihe ndị a na-ere', 'Choose a language': 'Họrọ asụsụ', 'Language selection is stored in your Bese26 account.': 'A na-echekwa asụsụ ị họọrọ n’akaụntụ Bese26 gị.', 'Preference saved.': 'Echekwara nhọrọ.', 'Your experience': 'Ahụmahụ gị', 'Make it yours': 'Hazie ya maka gị', 'Alerts & updates': 'Ọkwa na mmelite', 'Stay in the loop': 'Nọgide na-amata', 'Privacy & contact': 'Nzuzo na kọntaktị', 'Control your visibility': 'Jikwaa ihe ndị ọzọ na-ahụ', 'Personal control center': 'Ebe njikwa onwe', 'Personalize your Bese26 experience.': 'Hazie ahụmahụ Bese26 gị.', 'Manage your theme, language, alerts, privacy and buyer communication in one place.': 'Jikwaa ọdịdị, asụsụ, ọkwa, nzuzo na ozi ndị na-azụ ahịa n’otu ebe.', 'Choose the language you want to use across Bese26.': 'Họrọ asụsụ ịchọrọ iji n’ime Bese26 niile.', 'Your selection updates the whole app immediately.': 'Nhọrọ gị ga-agbanwe app niile ozugbo.', 'App language': 'Asụsụ app', 'Saved to your account': 'Echekwara na akaụntụ gị', 'Only Nigeria and NGN are currently supported.': 'Ugbu a naanị Nigeria na NGN ka anyị na-akwado.', 'Nigerian online marketplace for buying and selling.': 'Ahịa ịntanetị Naịjirịa maka ịzụ na ire.', Terms: 'Usoro', Privacy: 'Nzuzo', Refunds: 'Nkwụghachi ego', Safety: 'Nchekwa',
  },
};

const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const isTranslatableNode = (node) => {
  const parent = node.parentElement;
  if (!parent) return false;
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(parent.tagName)) return false;
  if (parent.closest('[data-bese26-no-translate="true"]')) return false;
  return Boolean(normalize(node.nodeValue));
};

function translateString(value, locale) {
  const source = normalize(value);
  if (!source || locale === 'en') return value;
  return translations[locale]?.[source] || common[source] || value;
}

function translateDocument(locale) {
  if (typeof document === 'undefined' || !document.body) return;
  const dictionaryLocale = translations[locale] ? locale : 'en';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (isTranslatableNode(node)) {
      const current = node.nodeValue;
      const record = node.__bese26TranslationRecord;
      const source = record && current === record.rendered ? record.source : current;
      const leading = source.match(/^\s*/)?.[0] || '';
      const trailing = source.match(/\s*$/)?.[0] || '';
      const translated = translateString(source, dictionaryLocale);
      const rendered = `${leading}${translated.trim()}${trailing}`;
      if (current !== rendered) node.nodeValue = rendered;
      node.__bese26TranslationRecord = { source, rendered };
    }
    node = walker.nextNode();
  }
  document.querySelectorAll('input, textarea, [aria-label], [title]').forEach((element) => {
    ['placeholder', 'aria-label', 'title'].forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      const current = element.getAttribute(attribute) || '';
      const records = element.__bese26AttributeRecords || {};
      const record = records[attribute];
      const source = record && current === record.rendered ? record.source : current;
      const translated = translateString(source, dictionaryLocale);
      if (current !== translated) element.setAttribute(attribute, translated);
      records[attribute] = { source, rendered: translated };
      element.__bese26AttributeRecords = records;
    });
  });
}

const I18nContext = createContext(null);
const readLocale = () => {
  try {
    const stored = localStorage.getItem('bese26:locale') || localStorage.getItem('bese26:language') || 'en';
    return LOCALES.some((item) => item.code === stored) ? stored : 'en';
  } catch { return 'en'; }
};

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(readLocale);
  const translatingRef = useRef(false);
  const setLocale = useCallback((next) => {
    const value = LOCALES.some((item) => item.code === next) ? next : 'en';
    setLocaleState(value);
    try {
      localStorage.setItem('bese26:locale', value);
      localStorage.setItem('bese26:language', value);
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.documentElement.lang = locale;
    const apply = () => {
      if (translatingRef.current) return;
      translatingRef.current = true;
      translateDocument(locale);
      translatingRef.current = false;
    };
    apply();
    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
    return () => observer.disconnect();
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, locales: LOCALES, t: (key, fallback = key) => translations[locale]?.[key] || common[key] || fallback }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext) || { locale: 'en', setLocale: () => {}, locales: LOCALES, t: (key, fallback = key) => fallback };
}
