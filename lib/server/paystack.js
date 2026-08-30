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

export async function getBoostPackage({ supabase, packageId }) {
  if (!packageId) throw new Error('Choose a boost package.');
  const { data, error } = await supabase.from('boost_packages').select('id,name,duration_days,price_kobo,placement,is_active').eq('id', packageId).eq('is_active', true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('That boost package is not available.');
  return data;
}

export async function createBoostPayment({ supabase, user, listingId, packageId, reference }) {
  const pkg = await getBoostPackage({ supabase, packageId });
  const { data: listing, error: listingError } = await supabase.from('listings').select('id,seller_id,status,moderation_status').eq('id', listingId).eq('seller_id', user.id).maybeSingle();
  if (listingError) throw listingError;
  if (!listing || listing.status !== 'active' || listing.moderation_status !== 'approved') throw new Error('Only your approved active listings can be boosted.');
  const { data: boost, error: boostError } = await supabase.from('listing_boosts').insert({ listing_id: listing.id, seller_id: user.id, package_id: pkg.id, payment_reference: reference, status: 'pending' }).select('id,listing_id,package_id,status').single();
  if (boostError) throw boostError;
  const { error: paymentError } = await supabase.from('payment_transactions').insert({ user_id: user.id, plan_key: 'boost', purpose: 'boost', listing_boost_id: boost.id, reference, amount_kobo: pkg.price_kobo, currency: 'NGN', status: 'initialized', provider: 'paystack' });
  if (paymentError) throw paymentError;
  return { package: pkg, boost };
}

export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase server configuration is incomplete.');
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getSupabaseAuthClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error('Supabase auth configuration is incomplete.');
  return createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
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
  const authClient = getSupabaseAuthClient();
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new Error('Your Supabase session is invalid or expired. Sign in again.');
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
  if (planKey === 'boost') {
    const boostId = metadata.boost_id || payment?.listing_boost_id;
    if (!reference || !userId || !boostId) throw new Error('Boost payment metadata is incomplete.');
    const { data: boost, error: boostError } = await supabase.from('listing_boosts').select('id,package_id,status,boost_packages(duration_days,price_kobo)').eq('id', boostId).eq('seller_id', userId).maybeSingle();
    if (boostError) throw boostError;
    const pkg = boost?.boost_packages;
    if (!boost || !pkg || Number(providerData?.amount || payment?.amount_kobo) !== pkg.price_kobo) throw new Error('Boost payment amount does not match the selected package.');
    if (String(providerData?.currency || 'NGN').toUpperCase() !== 'NGN') throw new Error('Unsupported payment currency.');
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + Number(pkg.duration_days) * 86400000);
    const { error: paymentError } = await supabase.from('payment_transactions').update({ status: 'successful', paystack_transaction_id: providerData?.id || null, event_name: eventName, updated_at: startsAt.toISOString() }).eq('reference', reference).eq('user_id', userId);
    if (paymentError) throw paymentError;
    const { error: boostUpdateError } = await supabase.from('listing_boosts').update({ status: 'active', starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), updated_at: startsAt.toISOString() }).eq('id', boostId).eq('seller_id', userId).neq('status', 'active');
    if (boostUpdateError) throw boostUpdateError;
    return { userId, planKey, reference, boostId };
  }
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
