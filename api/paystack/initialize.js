import crypto from 'node:crypto';
import { callbackUrl, getPlan, paystackRequest, readJson, recordInitializedPayment, requireUser, sendJson } from '../../lib/server/paystack.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  let reference = null;
  try {
    const { supabase, user } = await requireUser(req);
    const { planKey } = await readJson(req);
    const plan = getPlan(planKey);
    reference = `bese26_${user.id.slice(0, 8)}_${crypto.randomUUID()}`;
    await recordInitializedPayment({ supabase, user, plan, reference });
    const data = await paystackRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        amount: plan.amountKobo,
        plan: plan.planCode,
        reference,
        callback_url: callbackUrl(req),
        metadata: { user_id: user.id, plan_key: plan.key },
      }),
    });
    return sendJson(res, 200, { authorization_url: data.authorization_url, access_code: data.access_code, reference, plan_key: plan.key });
  } catch (error) {
    return sendJson(res, error.message?.includes('session') || error.message?.includes('Sign in') ? 401 : 400, { error: error.message || 'Could not start Paystack checkout.', reference });
  }
}
