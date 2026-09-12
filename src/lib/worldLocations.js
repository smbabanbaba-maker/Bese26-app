import { Country, State } from 'country-state-city';

export const worldwideCountries = Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name));
export const countryByName = Object.fromEntries(worldwideCountries.map((country) => [country.name, country]));
export const currencyOptions = ['NGN', 'CNY', 'INR', 'GBP', 'USD', 'PKR', 'BDT', 'CAD', 'AUD', 'ZAR', 'GHS', 'KES', 'QAR', 'AED', 'EUR'];
export const getStatesForCountry = (countryName) => {
  const country = countryByName[countryName] || worldwideCountries.find((item) => item.iso2 === countryName);
  return country ? State.getStatesOfCountry(country.iso2).map((item) => item.name).sort((a, b) => a.localeCompare(b)) : [];
};
export const currencyLabel = (code) => ({ NGN: 'NGN / ₦', CNY: 'CNY / ¥', INR: 'INR / ₹', GBP: 'GBP / £', USD: 'USD / $', PKR: 'PKR / ₨', BDT: 'BDT / ৳', CAD: 'CAD / $', AUD: 'AUD / $', ZAR: 'ZAR / R', GHS: 'GHS / ₵', KES: 'KES / KSh', QAR: 'QAR / ﷼', AED: 'AED / د.إ', EUR: 'EUR / €' }[code] || code);
