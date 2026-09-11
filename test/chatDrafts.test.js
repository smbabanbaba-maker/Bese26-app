import test from 'node:test';
import assert from 'node:assert/strict';
import { saveListingChatDraft, takeListingChatDraft } from '../src/lib/chatDrafts.js';

test('carries a listing question into chat exactly once', () => {
  saveListingChatDraft('listing-1', '  Is this still available?  ');
  assert.equal(takeListingChatDraft('listing-1'), 'Is this still available?');
  assert.equal(takeListingChatDraft('listing-1'), '');
});

test('does not retain an empty listing question', () => {
  saveListingChatDraft('listing-2', 'Last price?');
  saveListingChatDraft('listing-2', '   ');
  assert.equal(takeListingChatDraft('listing-2'), '');
});
