const CALL_PREFERENCES = new Set(['call', 'chat_call', 'both']);
const WHATSAPP_PREFERENCES = new Set(['whatsapp', 'chat_whatsapp', 'chat_call', 'both']);

/**
 * Resolve the detail-page contact buttons from the seller's saved listing preference.
 * A single direct channel is paired with Bese26 Message; when both direct channels
 * are available, the pair is WhatsApp + Call. Message is the sole fallback otherwise.
 */
export function getListingContactActions({
  contactPreference,
  phoneAvailable = false,
  whatsappAvailable = false,
  loading = false,
} = {}) {
  const preference = String(contactPreference || '').trim().toLowerCase();
  const allowsPhone = !preference || CALL_PREFERENCES.has(preference);
  const allowsWhatsApp = !preference || WHATSAPP_PREFERENCES.has(preference);
  const actions = [];

  if (allowsWhatsApp && (whatsappAvailable || loading)) actions.push('whatsapp');
  if (allowsPhone && (phoneAvailable || loading)) actions.push('call');
  if (actions.length < 2) actions.push('message');

  return actions;
}
