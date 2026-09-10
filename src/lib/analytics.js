const GA_MEASUREMENT_ID = 'G-PYW4VCZVLG';
let initialized = false;

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
