const OFFICIAL_BESE26_LOGO = '/images/bese26-logo-icon.webp';

function getContainedBusinessLogoUrl(logoUrl) {
  const source = String(logoUrl || '');
  if (!source) return '';

  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'https://bese26.invalid/';
    const url = new URL(source, base);
    const objectPrefix = '/storage/v1/object/public/';
    const renderPrefix = '/storage/v1/render/image/public/';

    if (url.pathname.includes(objectPrefix)) {
      url.pathname = url.pathname.replace(objectPrefix, renderPrefix);
    }
    if (!url.pathname.includes(renderPrefix)) return source;

    url.searchParams.set('width', '256');
    url.searchParams.set('height', '256');
    url.searchParams.set('resize', 'contain');
    url.searchParams.set('quality', '75');
    url.searchParams.set('format', 'webp');
    return url.href;
  } catch {
    return source;
  }
}

export function isOfficialBese26Business(business) {
  const handle = String(business?.business_handle || '').replace(/^@/, '').trim().toLowerCase();
  const name = String(business?.business_name || '').trim().toLowerCase();
  return handle === 'bese26' && name === 'bese26';
}

export function getBusinessLogoDisplayUrl(business, logoUrl = '') {
  if (isOfficialBese26Business(business)) return OFFICIAL_BESE26_LOGO;
  if (business?.logo_path) return getContainedBusinessLogoUrl(logoUrl);
  return logoUrl || '';
}

export function handleBusinessLogoLoad(event) {
  const image = event?.currentTarget;
  if (!image) return;

  const isTallPortrait = image.naturalWidth > 0 && image.naturalHeight / image.naturalWidth > 1.1;
  image.classList.toggle('is-tall-business-logo', isTallPortrait);
  image.classList.add('is-business-logo-previewable');
  image.title = image.title || 'Open full logo';
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
