import { fulfillSuccessfulPayment, getSupabaseAdmin, readRawBody, sendJson, verifySignature } from '../../lib/server/paystack.js';

export const config = { api: { bodyParser: false } };

function metadataFor(data = {}) {
  return data.metadata || {};
}

async function handleEvent(supabase, event, data) {
  if (event === 'charge.success') {
    const metadata = metadataFor(data);
    if (metadata.user_id && metadata.plan_key) {
      const { data: payment } = await supabase.from('payment_transactions').select('id,user_id,plan_key,purpose,listing_boost_id,reference,amount_kobo,status').eq('reference', data.reference).eq('user_id', metadata.user_id).maybeSingle();
      if (payment) await fulfillSuccessfulPayment({ supabase, payment, eventName: event, providerData: data });
    }
    return;
  }

  if (event === 'subscription.create') {
    const customerCode = data.customer?.customer_code || data.customer?.id?.toString();
    const planCode = data.plan?.plan_code || data.plan?.code;
    const planKey = Object.entries({ basic: process.env.PAYSTACK_BASIC_PLAN_CODE, premium: process.env.PAYSTACK_PREMIUM_PLAN_CODE, business: process.env.PAYSTACK_BUSINESS_PLAN_CODE }).find(([, code]) => code && code === planCode)?.[0];
    if (!customerCode || !planKey) return;
    await supabase.from('seller_subscriptions').update({ status: 'active', plan_key: planKey, provider: 'paystack', provider_customer_id: customerCode, provider_subscription_id: data.subscription_code || null, current_period_start: data.start ? new Date(data.start * 1000).toISOString() : new Date().toISOString(), current_period_end: data.next_payment_date || null, updated_at: new Date().toISOString() }).eq('provider_customer_id', customerCode);
    return;
  }

  if (event === 'invoice.update' || event === 'invoice.payment_failed' || event === 'subscription.not_renew') {
    const customerCode = data.customer?.customer_code || data.customer?.id?.toString();
    if (!customerCode) return;
    const status = event === 'invoice.payment_failed' || event === 'subscription.not_renew' ? 'paused' : 'active';
    await supabase.from('seller_subscriptions').update({ status, current_period_end: data.next_payment_date || undefined, updated_at: new Date().toISOString() }).eq('provider_customer_id', customerCode);
    return;
  }

  if (event === 'subscription.disable') {
    const customerCode = data.customer?.customer_code || data.customer?.id?.toString();
    const subscriptionCode = data.subscription_code || data.subscription?.subscription_code;
    if (customerCode) await supabase.from('seller_subscriptions').update({ status: 'canceled', provider_subscription_id: subscriptionCode || undefined, updated_at: new Date().toISOString() }).eq('provider_customer_id', customerCode);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  try {
    const rawBody = await readRawBody(req);
    if (!verifySignature(rawBody, req.headers['x-paystack-signature'])) return sendJson(res, 401, { error: 'Invalid webhook signature.' });
    const event = JSON.parse(rawBody.toString('utf8'));
    const supabase = getSupabaseAdmin();
    await handleEvent(supabase, event.event, event.data || {});
    return sendJson(res, 200, { received: true });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Webhook processing failed.' });
  }
}
