import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDirectorySearch } from '../src/lib/businessDirectory.js';

test('normalizes business directory searches safely', () => {
  assert.equal(normalizeDirectorySearch('  @Kano   Phones  '), 'Kano Phones');
  assert.equal(normalizeDirectorySearch('shop),is_active.eq.false'), 'shop is active.eq.false');
});

test('keeps normal Hausa and business-name characters', () => {
  assert.equal(normalizeDirectorySearch("Kasuwar Ƙofar Wambai & Sons Ltd."), "Kasuwar Ƙofar Wambai & Sons Ltd.");
});
