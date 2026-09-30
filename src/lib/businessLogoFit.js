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
  // Keep normal/square marks fully visible; crop tall portrait marks to fill their square frame.
  const isTallPortrait = image.naturalWidth > 0 && image.naturalHeight / image.naturalWidth > 1.1;
  image.classList.toggle('is-tall-business-logo', isTallPortrait);
}
