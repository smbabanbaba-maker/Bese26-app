import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const PLANS = {
  basic: { name: 'Basic', amountNaira: 4999, amountKobo: 499900, env: 'PAYSTACK_BASIC_PLAN_CODE', listingLimit: 20 },
  premium: { name: 'Premium', amountNaira: 9999, amountKobo: 999900, env: 'PAYSTACK_PREMIUM_PLAN_CODE', listingLimit: 60 },
  business: { name: 'Business', amountNaira: 29999, amountKobo: 2999900, env: 'PAYSTACK_BUSINESS_PLAN_CODE', listingLimit: 250 },
};

export function getPlan(planKey) {
  const plan = PLANS[String(planKey || '').toLowerCase()];
  if (!plan) throw new Error('Choose a valid Basic, Premium, or Business plan.');
  const planCode = process.env[plan.env];
  if (!planCode) throw new Error(`${plan.name} Paystack plan code is not configured yet.`);
  return { key: String(planKey).toLowerCase(), ...plan, planCode };
}

export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase server configuration is incomplete.');
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function getPaystackSecret() {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('Paystack server configuration is incomplete.');
  return process.env.PAYSTACK_SECRET_KEY;
}

export function sendJson(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(payload));
}

export async function readRawBody(req) {
  if (req.rawBody) return Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  try { return JSON.parse(raw.toString('utf8')); } catch { throw new Error('Invalid JSON request.'); }
}

export async function requireUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw new Error('Sign in before starting a subscription.');
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Your session has expired. Sign in again.');
  return { supabase, user: data.user };
}

export function callbackUrl(req) {
  return process.env.PAYSTACK_CALLBACK_URL || `${process.env.APP_URL || `https://${req.headers.host}`}/?payment=paystack`;
}

export function verifySignature(rawBody, signature) {
  const expected = crypto.createHmac('sha512', getPaystackSecret()).update(rawBody).digest('hex');
  const supplied = String(signature || '');
  if (!supplied || supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function paystackRequest(path, options = {}) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${getPaystackSecret()}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === false) throw new Error(payload.message || `Paystack request failed (${response.status}).`);
  return payload.data;
}

export async function recordInitializedPayment({ supabase, user, plan, reference }) {
  const { error } = await supabase.from('payment_transactions').insert({
    user_id: user.id,
    plan_key: plan.key,
    reference,
    amount_kobo: plan.amountKobo,
    currency: 'NGN',
    status: 'initialized',
    provider: 'paystack',
  });
  if (error) throw error;
}

export async function fulfillSuccessfulPayment({ supabase, payment, eventName, providerData }) {
  const metadata = providerData?.metadata || {};
  const reference = providerData?.reference || payment?.reference || null;
  const userId = metadata.user_id || payment?.user_id || null;
  const planKey = String(metadata.plan_key || payment?.plan_key || '').toLowerCase();
  const plan = PLANS[planKey];
  if (!reference || !userId || !plan) throw new Error('Payment metadata is incomplete.');
  if (Number(providerData?.amount || payment?.amount_kobo) !== plan.amountKobo) throw new Error('Payment amount does not match the selected plan.');
  if (String(providerData?.currency || 'NGN').toUpperCase() !== 'NGN') throw new Error('Unsupported payment currency.');

  const providerCustomer = providerData?.customer?.customer_code || providerData?.customer?.id?.toString() || null;
  const providerSubscription = providerData?.subscription_code || providerData?.subscription?.subscription_code || null;
  const { error: paymentError } = await supabase.from('payment_transactions').update({
    status: 'successful',
    paystack_transaction_id: providerData?.id || null,
    provider_customer_id: providerCustomer,
    provider_subscription_id: providerSubscription,
    event_name: eventName,
    updated_at: new Date().toISOString(),
  }).eq('reference', reference).eq('user_id', userId);
  if (paymentError) throw paymentError;

  const nextPeriod = providerData?.next_payment_date ? new Date(providerData.next_payment_date) : new Date();
  if (!providerData?.next_payment_date) nextPeriod.setMonth(nextPeriod.getMonth() + 1);
  const { error: subscriptionError } = await supabase.from('seller_subscriptions').upsert({
    profile_id: userId,
    plan_key: planKey,
    status: 'active',
    provider: 'paystack',
    provider_customer_id: providerCustomer,
    provider_subscription_id: providerSubscription,
    current_period_start: new Date().toISOString(),
    current_period_end: nextPeriod.toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'profile_id' });
  if (subscriptionError) throw subscriptionError;
  return { userId, planKey, reference };
}
