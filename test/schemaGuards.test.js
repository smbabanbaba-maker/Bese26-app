import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('database migrations retain free and paid listing-limit guards', () => {
  const freeLimit = read('supabase/migrations/20260828090000_subscription_entitlements_and_free_posts.sql');
  const paidLimit = read('supabase/migrations/20260909180000_paid_entitlements_and_verification_gate.sql');
  assert.match(freeLimit, /free_posts_used\s*<\s*3/i);
  assert.match(paidLimit, /create trigger listings_paid_limit_guard/i);
  assert.match(paidLimit, /before insert or update of status on public\.listings/i);
});

test('database migrations retain the conversation activity trigger', () => {
  const migration = read('supabase/migrations/20260827063000_harden_security_definer_functions.sql');
  assert.match(migration, /create trigger touch_conversation_from_message_trigger/i);
  assert.match(migration, /after insert on public\.messages/i);
});

test('the app restores sessions, watches auth changes, and checks suspensions', () => {
  const app = read('src/App.jsx');
  assert.match(app, /supabase\.auth\.getSession\(\)/);
  assert.match(app, /supabase\.auth\.onAuthStateChange\(/);
  assert.match(app, /select\('admin_suspended'\)/);
});
