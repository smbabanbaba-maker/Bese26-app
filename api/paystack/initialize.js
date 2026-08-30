import crypto from 'node:crypto';
import { callbackUrl, createBoostPayment, getPlan, paystackRequest, readJson, recordInitializedPayment, requireUser, sendJson } from '../../lib/server/paystack.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  let reference = null;
  try {
    const { supabase, user } = await requireUser(req);
    const body = await readJson(req);
    const mode = String(body.mode || 'subscription').toLowerCase();
    reference = `bese26_${user.id.slice(0, 8)}_${crypto.randomUUID()}`;
    let amountKobo;
    let metadata;
    if (mode === 'boost') {
      const { package: pkg, boost } = await createBoostPayment({ supabase, user, listingId: body.listingId, packageId: body.packageId, reference });
      amountKobo = pkg.price_kobo;
      metadata = { user_id: user.id, plan_key: 'boost', boost_id: boost.id, listing_id: boost.listing_id, package_id: pkg.id };
    } else {
      const plan = getPlan(body.planKey);
      await recordInitializedPayment({ supabase, user, plan, reference });
      amountKobo = plan.amountKobo;
      metadata = { user_id: user.id, plan_key: plan.key };
    }
    const data = await paystackRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({ email: user.email, amount: amountKobo, reference, callback_url: callbackUrl(req), metadata }),
    });
    return sendJson(res, 200, { authorization_url: data.authorization_url, access_code: data.access_code, reference, mode });
  } catch (error) {
    return sendJson(res, error.message?.includes('session') || error.message?.includes('Sign in') ? 401 : 400, { error: error.message || 'Could not start Paystack checkout.', reference });
  }
}
