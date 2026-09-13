const CURRENCY_SYMBOLS = {
  NGN: '₦', CNY: '¥', INR: '₹', GBP: '£', USD: '$', PKR: '₨', BDT: '৳',
  CAD: '$', AUD: '$', ZAR: 'R', GHS: '₵', KES: 'KSh', QAR: '﷼', AED: 'د.إ', EUR: '€',
};

export const currencyOptions = Object.keys(CURRENCY_SYMBOLS);

export const currencyLabel = (code) => {
  const value = String(code || '').toUpperCase();
  return `${value} / ${CURRENCY_SYMBOLS[value] || value}`;
};
