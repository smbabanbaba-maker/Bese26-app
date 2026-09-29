import { getAvatarUrl } from './supabase';
import { getBusinessLogoDisplayUrl, isOfficialBese26Business } from './businessLogoFit';

export function getPublicIdentity(profile, fallback = 'Bese26 member') {
  const business = profile?.business || profile?.business_profile || null;
  const businessName = String(business?.business_name || '').trim();
  const personalName = profile?.display_name || profile?.username || fallback;
  const businessLogo = business
    ? getBusinessLogoDisplayUrl(business, business.logo_url || (business.logo_path ? getAvatarUrl(business.logo_path) : ''))
    : '';
  const personalLogo = profile?.avatar_url || (profile?.avatar_path ? getAvatarUrl(profile.avatar_path) : '');
  return {
    name: businessName || personalName,
    image: businessLogo || personalLogo,
    business,
    isBusiness: Boolean(businessName || businessLogo || isOfficialBese26Business(business)),
  };
}

export function withPublicIdentity(profile, fallback = 'Bese26 member') {
  return { ...profile, publicIdentity: getPublicIdentity(profile, fallback) };
}
