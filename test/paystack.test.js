import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PLANS,
  assertPaymentOwner,
  fulfillSuccessfulPayment,
  getPaystackSecret,
  getPlan,
  verifySignature,
} from '../lib/server/paystack.js';

function withEnvironment(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try { return callback(); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('paid plans keep the expected Paystack amounts and listing limits', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(PLANS).map(([key, plan]) => [key, [plan.amountNaira, plan.amountKobo, plan.listingLimit]])),
    { basic: [2999, 299900, 15], premium: [7000, 700000, 35], business: [14999, 1499900, 60] },
  );
  withEnvironment({ PAYSTACK_BASIC_PLAN_CODE: 'PLN_basic_test' }, () => {
    assert.equal(getPlan('BASIC').planCode, 'PLN_basic_test');
  });
  assert.throws(() => getPlan('free'), /valid Basic, Premium, or Business plan/);
});

test('Paystack secret validation rejects public and malformed keys', () => {
  withEnvironment({ PAYSTACK_SECRET_KEY: 'pk_test_public_key' }, () => assert.throws(getPaystackSecret, /public key/));
  withEnvironment({ PAYSTACK_SECRET_KEY: 'not-a-paystack-key' }, () => assert.throws(getPaystackSecret, /format is invalid/));
  const testSecret = ['sk', 'test', '1234567890abcdef'].join('_');
  withEnvironment({ PAYSTACK_SECRET_KEY: ` ${testSecret} ` }, () => assert.equal(getPaystackSecret(), testSecret));
});

test('Paystack webhook signatures use the configured secret', () => {
  const testSecret = ['sk', 'test', '1234567890abcdef'].join('_');
  withEnvironment({ PAYSTACK_SECRET_KEY: testSecret }, () => {
    const body = Buffer.from('{"event":"charge.success"}');
    const signature = crypto.createHmac('sha512', getPaystackSecret()).update(body).digest('hex');
    assert.equal(verifySignature(body, signature), true);
    assert.equal(verifySignature(body, '0'.repeat(128)), false);
  });
});

test('payment verification enforces account ownership', () => {
  assert.doesNotThrow(() => assertPaymentOwner({ metadata: { user_id: 'user-1' } }, 'user-1'));
  assert.throws(() => assertPaymentOwner({ metadata: { user_id: 'user-2' } }, 'user-1'), /does not belong/);
  assert.throws(() => assertPaymentOwner({}, 'user-1'), /does not belong/);
});

test('Paystack initialization logs never include secret-key fingerprints', () => {
  const source = readFileSync(new URL('../api/paystack/initialize.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /keyPrefix|keyLength|configuredKey/);
});

test('subscription fulfillment rejects wrong amounts and currencies before database writes', async () => {
  const supabase = new Proxy({}, { get() { throw new Error('Database should not be touched.'); } });
  const payment = { reference: 'ref-1', user_id: 'user-1', plan_key: 'basic', amount_kobo: 299900 };
  const metadata = { user_id: 'user-1', plan_key: 'basic' };
  await assert.rejects(
    fulfillSuccessfulPayment({ supabase, payment, eventName: 'charge.success', providerData: { reference: 'ref-1', amount: 1, currency: 'NGN', metadata } }),
    /amount does not match/,
  );
  await assert.rejects(
    fulfillSuccessfulPayment({ supabase, payment, eventName: 'charge.success', providerData: { reference: 'ref-1', amount: 299900, currency: 'USD', metadata } }),
    /Unsupported payment currency/,
  );
});
