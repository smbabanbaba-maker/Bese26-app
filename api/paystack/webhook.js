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
