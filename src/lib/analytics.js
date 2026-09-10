const GA_MEASUREMENT_ID = 'G-PYW4VCZVLG';
let initialized = false;

function handleTrackedClick(event) {
  const link = event.target.closest?.('a,button');
  if (!link) return;
  const href = link.getAttribute('href') || '';
  const label = (link.getAttribute('aria-label') || link.textContent || '').trim().slice(0, 100);
  if (href.startsWith('https://wa.me/') || href.includes('whatsapp.com')) {
    trackEvent('whatsapp_click', { link_url: href, link_text: label });
  } else if (href.startsWith('tel:')) {
    trackEvent('phone_click', { link_url: href, link_text: label });
  } else if (href.startsWith('mailto:')) {
    trackEvent('email_click', { link_url: href, link_text: label });
  } else if (href.startsWith('http') && new URL(href, window.location.href).hostname !== window.location.hostname) {
    trackEvent('outbound_click', { link_url: href, link_text: label });
  } else if (link instanceof HTMLAnchorElement && link.download) {
    trackEvent('file_download', { file_name: link.download || href, link_url: href });
  }
}

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false, anonymize_ip: true });

  if (!document.querySelector(`script[data-bese26-ga="${GA_MEASUREMENT_ID}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.dataset.bese26Ga = GA_MEASUREMENT_ID;
    document.head.appendChild(script);
  }
  document.addEventListener('click', handleTrackedClick, true);
}

export function trackPageView(path = window.location.pathname + window.location.search + window.location.hash) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href, page_title: document.title });
}

export function trackEvent(action, parameters = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', action, parameters);
}

export { GA_MEASUREMENT_ID };
