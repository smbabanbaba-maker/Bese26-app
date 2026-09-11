import test from 'node:test';
import assert from 'node:assert/strict';
import { withActiveListingUsage } from '../src/lib/sellerEntitlement.js';

test('uses active listing count for the subscription capacity display', () => {
  const result = withActiveListingUsage({ plan_key: 'basic', listing_limit: 15, free_posts_used: 3 }, [{ id: 1 }, { id: 2 }]);
  assert.equal(result.free_posts_used, 2);
  assert.equal(result.free_posts_remaining, 13);
  assert.equal(result.free_posts_limit, 15);
});

test('never displays negative remaining listing capacity', () => {
  const result = withActiveListingUsage({ listing_limit: 3 }, [{}, {}, {}, {}]);
  assert.equal(result.free_posts_remaining, 0);
});
