import { getSupabaseAdmin, requireUser, sendJson } from '../../lib/server/paystack.js';

const OWNER_EMAIL = 'smbabanbaba@gmail.com';

function isSafeDocumentPath(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 600 && !value.startsWith('/') && !value.includes('..') && !value.includes('\\');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed.' });
  try {
    const { supabase, user } = await requireUser(req);
    const profileResult = await supabase.from('profiles').select('app_role').eq('id', user.id).limit(1).maybeSingle();
    if (profileResult.error) throw profileResult.error;
    const teamResult = await supabase.from('admin_team_members').select('active,permissions').eq('user_id', user.id).eq('active', true).limit(1).maybeSingle();
    if (teamResult.error && teamResult.error.code !== 'PGRST116') throw teamResult.error;
    const isOwner = String(user.email || '').toLowerCase() === OWNER_EMAIL;
    const isProfileAdmin = ['admin', 'moderator', 'owner'].includes(String(profileResult.data?.app_role || '').toLowerCase());
    const permissions = teamResult.data?.permissions || [];
    const isDelegatedAdmin = Boolean(teamResult.data?.active && permissions.includes('verification'));
    if (!isOwner && !isProfileAdmin && !isDelegatedAdmin) return sendJson(res, 403, { error: 'Admin verification access is required.' });

    const path = new URL(req.url, 'https://bese26.shop').searchParams.get('path');
    if (!isSafeDocumentPath(path)) return sendJson(res, 400, { error: 'A valid document path is required.' });
    const { data, error } = await supabase.storage.from('verification-documents').download(path);
    if (error || !data) return sendJson(res, 404, { error: error?.message || 'Verification document was not found.' });
    const buffer = Buffer.from(await data.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('Content-Type', data.type || 'application/octet-stream');
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.end(buffer);
  } catch (error) {
    const message = error.message || 'Could not load the verification document.';
    return sendJson(res, message.toLowerCase().includes('session') || message.toLowerCase().includes('sign in') ? 401 : 400, { error: message });
  }
}
