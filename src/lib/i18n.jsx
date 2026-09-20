import { createContext, useContext, useMemo, useState } from 'react';

export const LOCALES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ha', label: 'Hausa', native: 'Hausa' },
  { code: 'pcm', label: 'Pidgin', native: 'Pidgin' },
  { code: 'yo', label: 'Yorùbá', native: 'Yorùbá' },
  { code: 'ig', label: 'Igbo', native: 'Igbo' },
];

const translations = {
  en: {},
  ha: {
    Home: 'Gida', Search: 'Nema', Sell: 'Sayar', Messages: 'Saƙonni', Notifications: 'Sanarwa', Profile: 'Bayanan kai',
    Save: 'Ajiye', Saved: 'An ajiye', 'Contact seller': 'Tuntuɓi mai sayarwa', 'View all': 'Duba duka', Back: 'Koma', Close: 'Rufe', Cancel: 'Soke', Continue: 'Ci gaba', Submit: 'Tura', Refresh: 'Sabunta', Loading: 'Ana lodawa…', 'Sign in': 'Shiga', 'Create account': 'Ƙirƙiri asusu', Logout: 'Fita', Settings: 'Saituna',
    'Language & Region': 'Harshe da Yanki', 'Interface language': 'Harshen manhaja', Currency: 'Kuɗi', 'Date format': 'Tsarin kwanan wata', Preferences: 'Zaɓuɓɓuka', Appearance: 'Siffa', 'Dark mode': 'Yanayin duhu', 'Light mode': 'Yanayin haske',
    'Account Center': 'Cibiyar Asusu', 'All updates': 'Dukkan sabuntawa', Unread: 'Ba a karanta ba', 'No notifications yet': 'Babu sanarwa tukuna', 'You are all caught up': 'Ka gama karanta komai', 'Stay informed about your listings, messages, payments, and account activity.': 'Kasance da masaniya kan tallace-tallacenka, saƙonni, biyan kuɗi, da ayyukan asusu.',
    'Marketplace is live': 'Kasuwar na aiki', 'Maintenance mode is ON': 'Yanayin gyara yana kunne', 'Pause marketplace': 'Dakatar da kasuwar', 'Resume marketplace': 'Sake kunna kasuwar', 'Owner Platform Control': 'Ikon Mai Gida', 'We’ll be back shortly': 'Za mu dawo nan ba da jimawa ba', 'Bese26 is temporarily unavailable while we make improvements.': 'Bese26 ba ya aiki na ɗan lokaci yayin da muke inganta shi.',
    'My Listings': 'Tallace-tallacena', 'Saved Items': 'Abubuwan da aka ajiye', Drafts: 'Abubuwan da ba a gama ba', 'Sold Items': 'Abubuwan da aka sayar', 'Seller Analytics': 'Bayanan mai sayarwa', 'Personal Information': 'Bayanan kai', 'Login & Security': 'Shiga da tsaro', 'Help Center': 'Cibiyar taimako', 'Safety Center': 'Cibiyar tsaro',
    'Add listing': 'Ƙara talla', 'Manage listings': 'Sarrafa tallace-tallace', 'Choose a language': 'Zaɓi harshe', 'Language selection is stored in your Bese26 account.': 'Ana adana zaɓin harshenka a asusun Bese26.', 'Preference saved.': 'An adana zaɓi.',
  },
  pcm: {
    Home: 'Home', Search: 'Search', Sell: 'Sell', Messages: 'Messages', Notifications: 'Notifications', Profile: 'Profile', Save: 'Save', Saved: 'Saved', 'Contact seller': 'Contact seller', 'View all': 'View all', Back: 'Back', Close: 'Close', Cancel: 'Cancel', Continue: 'Continue', Submit: 'Submit', Refresh: 'Refresh', Loading: 'Loading…', 'Sign in': 'Log in', 'Create account': 'Create account', Logout: 'Log out', Settings: 'Settings',
    'Language & Region': 'Language & Region', 'Interface language': 'App language', Currency: 'Currency', 'Date format': 'Date format', Preferences: 'Preferences', Appearance: 'Appearance', 'Dark mode': 'Dark mode', 'Light mode': 'Light mode',
    'Account Center': 'Account Center', 'All updates': 'All updates', Unread: 'Unread', 'No notifications yet': 'No notifications yet', 'You are all caught up': 'You don catch up', 'Stay informed about your listings, messages, payments, and account activity.': 'Stay updated about your listings, messages, payments, and account activity.',
    'Marketplace is live': 'Marketplace dey live', 'Maintenance mode is ON': 'Maintenance mode dey ON', 'Pause marketplace': 'Pause marketplace', 'Resume marketplace': 'Resume marketplace', 'Owner Platform Control': 'Owner Platform Control', 'We’ll be back shortly': 'We go dey back soon', 'Bese26 is temporarily unavailable while we make improvements.': 'Bese26 no dey available for now as we dey improve things.',
    'My Listings': 'My Listings', 'Saved Items': 'Saved Items', Drafts: 'Drafts', 'Sold Items': 'Sold Items', 'Seller Analytics': 'Seller Analytics', 'Personal Information': 'Personal Information', 'Login & Security': 'Login & Security', 'Help Center': 'Help Center', 'Safety Center': 'Safety Center',
    'Add listing': 'Add listing', 'Manage listings': 'Manage listings', 'Choose a language': 'Choose a language', 'Language selection is stored in your Bese26 account.': 'We save your language choice for your Bese26 account.', 'Preference saved.': 'Preference saved.',
  },
  yo: {
    Home: 'Ilé', Search: 'Wá', Sell: 'Ta', Messages: 'Àwọn ìfiranṣẹ́', Notifications: 'Àwọn ìfitónilétí', Profile: 'Profaili', Save: 'Fipamọ́', Saved: 'Ti fipamọ́', 'Contact seller': 'Kan sí olùtajà', 'View all': 'Wo gbogbo rẹ̀', Back: 'Padà', Close: 'Pa', Cancel: 'Fagilé', Continue: 'Tẹ̀síwájú', Submit: 'Firanṣẹ́', Refresh: 'Tún ṣe', Loading: 'Ń gbé wọlé…', 'Sign in': 'Wọlé', 'Create account': 'Ṣẹ̀dá àkáǹtì', Logout: 'Jáde', Settings: 'Ètò',
    'Language & Region': 'Èdè àti Agbègbè', 'Interface language': 'Èdè ìṣàfilọ́lẹ̀', Currency: 'Owó', 'Date format': 'Ìlànà ọjọ́', Preferences: 'Àwọn ààyò', Appearance: 'Ìrísí', 'Dark mode': 'Ìpo òkùnkùn', 'Light mode': 'Ìpo ìmọ́lẹ̀',
    'Account Center': 'Àárín àkáǹtì', 'All updates': 'Gbogbo àtúnṣe', Unread: 'Kò tíì kà', 'No notifications yet': 'Kò sí ìfitónilétí síbẹ̀', 'You are all caught up': 'O ti ka gbogbo rẹ̀', 'Stay informed about your listings, messages, payments, and account activity.': 'Mọ̀ nípa àwọn ohun tí o ń tà, ìfiranṣẹ́, ìsanwó àti iṣẹ́ àkáǹtì rẹ.',
    'Marketplace is live': 'Ọjà ń ṣiṣẹ́', 'Maintenance mode is ON': 'Ìpo àtúnṣe wà lórí', 'Pause marketplace': 'Dá ọjà dúró', 'Resume marketplace': 'Tẹ̀síwájú ọjà', 'Owner Platform Control': 'Ìṣàkóso olùní', 'We’ll be back shortly': 'A ó padà láìpẹ́', 'Bese26 is temporarily unavailable while we make improvements.': 'Bese26 kò sí fún ìgbà díẹ̀ bí a ṣe ń ṣe àtúnṣe.',
    'My Listings': 'Àwọn ohun tí mo ń tà', 'Saved Items': 'Àwọn ohun tí a fipamọ́', Drafts: 'Àwọn àkọ́kọ́', 'Sold Items': 'Àwọn tí a tà', 'Seller Analytics': 'Àlàyé olùtajà', 'Personal Information': 'Àlàyé ara ẹni', 'Login & Security': 'Wíwọlé àti ààbò', 'Help Center': 'Ibi ìrànwọ́', 'Safety Center': 'Ibi ààbò',
    'Add listing': 'Fi ohun kan sí', 'Manage listings': 'Ṣàkóso àwọn ohun tí o ń tà', 'Choose a language': 'Yan èdè', 'Language selection is stored in your Bese26 account.': 'A máa fi èdè tí o yàn pamọ́ sínú àkáǹtì Bese26 rẹ.', 'Preference saved.': 'A ti fipamọ́ ààyò.',
  },
  ig: {
    Home: 'Ụlọ', Search: 'Chọọ', Sell: 'Ree', Messages: 'Ozi', Notifications: 'Ọkwa', Profile: 'Profaịlụ', Save: 'Chekwaa', Saved: 'Echekwara', 'Contact seller': 'Kpọtụrụ onye na-ere', 'View all': 'Lee ha niile', Back: 'Laghachi', Close: 'Mechie', Cancel: 'Kagbuo', Continue: 'Gaa n’ihu', Submit: 'Zipụ', Refresh: 'Melite', Loading: 'Na-ebunye…', 'Sign in': 'Banye', 'Create account': 'Mepụta akaụntụ', Logout: 'Pụọ', Settings: 'Ntọala',
    'Language & Region': 'Asụsụ na Mpaghara', 'Interface language': 'Asụsụ ngwa', Currency: 'Ego', 'Date format': 'Ụdị ụbọchị', Preferences: 'Nhọrọ', Appearance: 'Ọdịdị', 'Dark mode': 'Ọnọdụ ọchịchịrị', 'Light mode': 'Ọnọdụ ìhè',
    'Account Center': 'Ebe Akaụntụ', 'All updates': 'Mmelite niile', Unread: 'Agụbeghị', 'No notifications yet': 'Ọkwa adịghị ugbu a', 'You are all caught up': 'Ị gụchala ihe niile', 'Stay informed about your listings, messages, payments, and account activity.': 'Nọgide na-amata maka ihe ị na-ere, ozi, ịkwụ ụgwọ na ọrụ akaụntụ gị.',
    'Marketplace is live': 'Ahịa na-arụ ọrụ', 'Maintenance mode is ON': 'Ọnọdụ ndozi dị ON', 'Pause marketplace': 'Kwụsị ahịa', 'Resume marketplace': 'Malite ahịa ọzọ', 'Owner Platform Control': 'Njikwa Onye nwe', 'We’ll be back shortly': 'Anyị ga-alọghachi obere oge', 'Bese26 is temporarily unavailable while we make improvements.': 'Bese26 adịghị nwa oge ka anyị na-emezi ya.',
    'My Listings': 'Ihe m na-ere', 'Saved Items': 'Ihe echekwara', Drafts: 'Ihe ndị a na-ede', 'Sold Items': 'Ihe e rere', 'Seller Analytics': 'Nchịkọta onye na-ere', 'Personal Information': 'Ozi nke onwe', 'Login & Security': 'Banye na nchekwa', 'Help Center': 'Ebe enyemaka', 'Safety Center': 'Ebe nchekwa',
    'Add listing': 'Tinye ihe ị na-ere', 'Manage listings': 'Jikwaa ihe ị na-ere', 'Choose a language': 'Họrọ asụsụ', 'Language selection is stored in your Bese26 account.': 'A na-echekwa asụsụ ị họọrọ n’akaụntụ Bese26 gị.', 'Preference saved.': 'Echekwara nhọrọ.',
  },
};

const I18nContext = createContext(null);
const readLocale = () => { try { return localStorage.getItem('bese26:locale') || 'en'; } catch { return 'en'; } };
export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(readLocale);
  const setLocale = (next) => { const value = LOCALES.some((item) => item.code === next) ? next : 'en'; setLocaleState(value); try { localStorage.setItem('bese26:locale', value); } catch {} };
  const value = useMemo(() => ({ locale, setLocale, locales: LOCALES, t: (key, fallback = key) => translations[locale]?.[key] || translations.en[key] || fallback }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() { return useContext(I18nContext) || { locale: 'en', setLocale: () => {}, locales: LOCALES, t: (key, fallback = key) => fallback }; }
