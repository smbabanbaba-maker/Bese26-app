import { fulfillSuccessfulPayment, getSupabaseAdmin, paystackRequest, readJson, requireUser, sendJson } from '../../lib/server/paystack.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  try {
    const { user } = await requireUser(req);
    const { reference } = await readJson(req);
    if (!reference || typeof reference !== 'string' || reference.length > 160) return sendJson(res, 400, { error: 'A valid payment reference is required.' });
    const data = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
    const metadata = data.metadata || {};
    if (metadata.user_id !== user.id) return sendJson(res, 403, { error: 'This payment does not belong to your account.' });
    if (data.status !== 'success') return sendJson(res, 200, { successful: false, status: data.status, message: 'Payment has not completed.' });
    const supabase = getSupabaseAdmin();
    const { data: payment, error } = await supabase.from('payment_transactions').select('id,user_id,plan_key,purpose,listing_boost_id,reference,amount_kobo,status').eq('reference', reference).eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!payment) return sendJson(res, 400, { error: 'Payment record was not found. Please start checkout again.' });
    const result = await fulfillSuccessfulPayment({ supabase, payment, eventName: 'charge.success', providerData: data });
    return sendJson(res, 200, { successful: true, ...result });
  } catch (error) {
    return sendJson(res, error.message?.includes('session') || error.message?.includes('Sign in') ? 401 : 400, { error: error.message || 'Could not verify Paystack payment.' });
  }
}
