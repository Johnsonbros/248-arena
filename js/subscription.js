// 248 Arena — Access Gate (lean launch)
// -----------------------------------------------------------------------------
// Controls who gets into the paid app. Designed for a "free for a week, then pay"
// launch using a Stripe Payment Link, with two enforcement options:
//
//   mode: 'cloudflare'  (RECOMMENDED, real lock)
//       Put the app subdomain/path behind Cloudflare Access. The edge blocks
//       anyone you haven't granted, so this script is a no-op pass-through.
//       Nothing here is bypassable because the app never loads for non-members.
//
//   mode: 'code'        (simplest, no Cloudflare — note: client-side, bypassable)
//       After someone subscribes, you give them an access code. They enter it
//       once and it's stored on their device. Good enough for a small first
//       cohort; upgrade to real accounts later. Set ACCESS_CONFIG.accessCode.
//
//   mode: 'off'         Everyone in (use only for local development).
//
// See LAUNCH.md for the full go-live checklist.
// -----------------------------------------------------------------------------

const ACCESS_CONFIG = {
  mode: 'code',                       // 'cloudflare' | 'code' | 'off'
  accessCode: 'SET_YOUR_CODE_HERE',   // used only in 'code' mode
  pricingUrl: 'pricing.html',
  billingPortalUrl: 'https://billing.stripe.com/p/login/14A00cbKX2s430HbVO0sU00'
};

const Subscription = {
  KEY: 'arena248_access',

  hasAccess() {
    if (ACCESS_CONFIG.mode === 'off' || ACCESS_CONFIG.mode === 'cloudflare') return true;
    if (ACCESS_CONFIG.mode === 'code') {
      return localStorage.getItem(this.KEY) === 'granted';
    }
    return false;
  },

  grantByCode(input) {
    const ok = (input || '').trim() === ACCESS_CONFIG.accessCode &&
               ACCESS_CONFIG.accessCode !== 'SET_YOUR_CODE_HERE';
    if (ok) localStorage.setItem(this.KEY, 'granted');
    return ok;
  },

  revoke() { localStorage.removeItem(this.KEY); },

  // Blocks the page with a paywall overlay if the visitor has no access.
  enforce() {
    if (this.hasAccess()) return;
    this._renderPaywall();
  },

  _renderPaywall() {
    const overlay = document.createElement('div');
    overlay.id = 'arena-paywall';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(10,10,15,0.97);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="max-width:420px;width:100%;background:rgba(255,255,255,0.03);
        border:1px solid rgba(0,212,255,0.3);border-radius:16px;padding:36px 28px;text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:8px;">⚔️</div>
        <h2 style="font-family:'Orbitron',sans-serif;color:#fff;letter-spacing:2px;font-size:1.4rem;">
          MEMBERS ONLY</h2>
        <p style="color:#9898b0;margin:12px 0 22px;font-size:0.95rem;line-height:1.5;">
          Start your <strong style="color:#00ff88;">7-day free trial</strong> to enter the Arena.
          No charge for a week. Cancel anytime.</p>
        <a href="${ACCESS_CONFIG.pricingUrl}"
          style="display:block;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#0a0a0f;
          font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;text-decoration:none;
          padding:14px;border-radius:10px;margin-bottom:14px;">START FREE TRIAL →</a>
        <div style="border-top:1px solid rgba(255,255,255,0.08);margin:18px 0;padding-top:18px;">
          <p style="color:#9898b0;font-size:0.85rem;margin-bottom:10px;">Already subscribed? Enter your access code:</p>
          <input id="arena-access-code" type="text" placeholder="Access code"
            style="width:100%;padding:11px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:#fff;text-align:center;margin-bottom:10px;">
          <button id="arena-access-btn"
            style="width:100%;padding:11px;border-radius:8px;border:1px solid rgba(0,212,255,0.4);
            background:transparent;color:#00d4ff;font-family:'Rajdhani',sans-serif;font-weight:700;
            letter-spacing:1px;cursor:pointer;">UNLOCK</button>
          <p id="arena-access-err" style="color:#ff2d55;font-size:0.8rem;margin-top:8px;display:none;">
            That code isn't valid. Check your welcome email.</p>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const btn = overlay.querySelector('#arena-access-btn');
    const input = overlay.querySelector('#arena-access-code');
    const err = overlay.querySelector('#arena-access-err');
    const tryUnlock = () => {
      if (this.grantByCode(input.value)) {
        overlay.remove();
        document.body.style.overflow = '';
      } else {
        err.style.display = 'block';
      }
    };
    btn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
  }
};

window.Subscription = Subscription;

// Auto-enforce as soon as the page is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Subscription.enforce());
} else {
  Subscription.enforce();
}
