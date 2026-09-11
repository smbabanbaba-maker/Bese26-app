const PUBLIC_CONTACT_PREFERENCES = new Set(['call', 'whatsapp', 'both']);
const LOCATION_VISIBILITIES = new Set(['city', 'approximate', 'exact']);

export function sanitizePublicBusinessProfile(profile = {}) {
  const publicContact = profile.public_contact === true;
  const contactPreference = PUBLIC_CONTACT_PREFERENCES.has(profile.contact_preference)
    ? profile.contact_preference
    : 'both';
  const locationVisibility = LOCATION_VISIBILITIES.has(profile.location_visibility)
    ? profile.location_visibility
    : 'city';

  return {
    ...profile,
    contact_preference: contactPreference,
    location_visibility: locationVisibility,
    phone: publicContact && ['call', 'both'].includes(contactPreference) ? profile.phone || '' : '',
    whatsapp: publicContact && ['whatsapp', 'both'].includes(contactPreference) ? profile.whatsapp || '' : '',
    email: publicContact ? profile.email || '' : '',
    area: locationVisibility === 'city' ? '' : profile.area || '',
    address: locationVisibility === 'exact' ? profile.address || '' : '',
    registration_number: '',
  };
}

export function formatPublicBusinessLocation(profile = {}) {
  const safeProfile = sanitizePublicBusinessProfile(profile);
  const parts = safeProfile.location_visibility === 'exact'
    ? [safeProfile.address, safeProfile.area, safeProfile.city, safeProfile.state, safeProfile.country]
    : safeProfile.location_visibility === 'approximate'
      ? [safeProfile.area, safeProfile.city, safeProfile.state, safeProfile.country]
      : [safeProfile.city, safeProfile.state, safeProfile.country];

  return [...new Set(parts.filter(Boolean))].join(', ');
}
