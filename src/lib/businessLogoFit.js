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

  const isTallPortrait = image.naturalWidth > 0 && image.naturalHeight / image.naturalWidth > 1.1;
  image.classList.toggle('is-tall-business-logo', isTallPortrait);
  if (!isTallPortrait) return;

  image.title = image.title || 'Open full logo';
  if (image.closest('button, a, [role="button"], [role="link"]')) return;

  image.tabIndex = 0;
  image.setAttribute('role', 'button');
  if (!image.hasAttribute('aria-label')) {
    image.setAttribute('aria-label', `Open full ${image.alt || 'business logo'}`);
  }
  if (image.dataset.businessLogoPreviewKeyBound !== 'true') {
    image.dataset.businessLogoPreviewKeyBound = 'true';
    image.addEventListener('keydown', (keyEvent) => {
      if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      image.click();
    });
  }
}
