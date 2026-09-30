const VERIFICATION_NOTIFICATION_TYPES = new Set([
  'identity_verification_reviewed',
  'business_verification_reviewed',
]);

/** Resolve a notification using its persisted target IDs, never its display text. */
export function resolveNotificationDestination(item = {}) {
  const type = String(item.notification_type || '').toLowerCase();
  const data = item.data && typeof item.data === 'object' ? item.data : {};
  const conversationId = data.conversation_id;

  // Offers carry both a listing and conversation ID; the offer belongs in chat.
  if (conversationId) {
    return {
      kind: 'conversation',
      conversationId,
      target: {
        kind: data.offer_id || type.startsWith('offer_') ? 'offer' : 'message',
        offerId: data.offer_id || null,
        messageId: data.message_id || null,
      },
    };
  }

  const listingId = data.listing_id;
  if (listingId) {
    if (type === 'listing_comment_reply') {
      return {
        kind: 'listing',
        listingId,
        focus: {
          section: 'discussion',
          commentId: data.comment_id || data.parent_comment_id || null,
        },
      };
    }
    if (type === 'callback_request') {
      return { kind: 'listing', listingId, focus: { section: 'contact' } };
    }
    return { kind: 'listing', listingId, focus: null };
  }

  if (type === 'new_follower') {
    return {
      kind: 'public-profile',
      username: item.actor?.username || data.username || null,
    };
  }

  if (VERIFICATION_NOTIFICATION_TYPES.has(type)) {
    return { kind: 'account', page: 'verification' };
  }

  return { kind: 'unavailable' };
}
