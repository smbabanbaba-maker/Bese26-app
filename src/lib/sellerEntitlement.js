export function withActiveListingUsage(access = {}, listings = []) {
  const listingLimit = Math.max(0, Number(access.listing_limit || 3));
  const activeCount = Array.isArray(listings) ? listings.length : 0;
  return {
    ...access,
    free_posts_used: activeCount,
    free_posts_remaining: Math.max(listingLimit - activeCount, 0),
    free_posts_limit: listingLimit,
  };
}
