const drafts = new Map();

export function saveListingChatDraft(listingId, message = '') {
  if (!listingId) return;
  const value = String(message).trim();
  if (value) drafts.set(listingId, value);
  else drafts.delete(listingId);
}

export function takeListingChatDraft(listingId) {
  if (!listingId) return '';
  const value = drafts.get(listingId) || '';
  drafts.delete(listingId);
  return value;
}
