const OFFICIAL_BESE26_LOGO = '/images/bese26-logo-icon.webp';

export function isOfficialBese26Business(business) {
  const handle = String(business?.business_handle || '').replace(/^@/, '').trim().toLowerCase();
  const name = String(business?.business_name || '').trim().toLowerCase();
  return handle === 'bese26' && name === 'bese26';
}

export function getBusinessLogoDisplayUrl(business, logoUrl = '') {
  if (isOfficialBese26Business(business)) return OFFICIAL_BESE26_LOGO;
  return logoUrl || '';
}

export function handleBusinessLogoLoad(event) {
  const image = event?.currentTarget;
  if (!image) return;
  // Remove the old aspect-ratio-specific variant so every logo uses the same centered frame.
  image.classList.remove('is-tall-business-logo');
}
