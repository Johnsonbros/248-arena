// 248 Arena — analytics
// -----------------------------------------------------------------------------
// Umami, self-hosted on the AiSync fleet. Chosen because it answers the only
// launch questions that matter — how many people reached pricing, how many
// started checkout, where they dropped — without cookies, without personal
// data, and without handing visitor behavior to an ad network. That keeps the
// privacy policy short and honest, and means no cookie banner.
//
// SETUP (once): create a website in Umami for 248arena.com, then set
// UMAMI.websiteId below to the id it gives you. Until then this file is inert —
// no script is injected and nothing is sent.

const UMAMI = {
  websiteId: '',                                   // paste the Umami website id here
  src: 'https://analytics.248arena.com/script.js', // your Umami instance
};

(function () {
  if (!UMAMI.websiteId || !UMAMI.src) return;                 // not configured yet
  if (location.hostname === 'localhost' || location.protocol === 'file:') return;
  if (/\/admin\.html$/.test(location.pathname)) return;       // never track the owner console

  const s = document.createElement('script');
  s.defer = true;
  s.src = UMAMI.src;
  s.setAttribute('data-website-id', UMAMI.websiteId);
  document.head.appendChild(s);
})();

// Funnel events. Called from the pages themselves; a no-op when analytics is
// off, so callers never need to guard.
window.track = function (event, data) {
  try {
    if (window.umami && typeof umami.track === 'function') umami.track(event, data);
  } catch (e) { /* analytics must never break the app */ }
};

window.UMAMI = UMAMI;
