import { supabase } from './supabase';

// Public half of the VAPID key used by the send-web-push Edge Function.
export const BESE26_VAPID_PUBLIC_KEY = 'BNR9Namj8uOcGYdtAGFXmJBfJRl_uBPfNifc4Bn9sIxK0tA2j4aTqzHzPcBJTHsKuob1-l6yIdJlD5WQm2FZojY';
export function isIosDevice() {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
export function isStandalonePwa() {
  return typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
}
function base64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export async function registerBese26PushSubscription(userId) {
  if (!supabase || !userId || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return { supported: false };
  if (!('Notification' in window) || Notification.permission !== 'granted') return { supported: true, enabled: false };
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(BESE26_VAPID_PUBLIC_KEY) });
  }
  const json = subscription.toJSON();
  const endpoint = json.endpoint || subscription.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error('This device returned an incomplete push subscription.');
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent.slice(0, 500),
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,endpoint' });
  if (error) throw error;
  return { supported: true, enabled: true };
}

export async function removeBese26PushSubscription(userId) {
  if (!supabase || !userId || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}
