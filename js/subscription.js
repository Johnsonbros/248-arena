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
  billingPortalUrl: 'https://billing.stripe.com/p/login/14A00cbKX2s430HbVO0sU00',
  // Admin phones get full access to everything, bypassing the paywall. Unlock by
  // entering the number in the paywall's code field, or visiting ?admin=<number> once.
  // NOTE: this is a client-side key (visible in the JS) — convenient, not high-security.
  // Move admin auth server-side when you add real accounts.
  adminPhones: ['6176868763']
};

const Subscription = {
  KEY: 'arena248_access',
  ADMIN_KEY: 'arena248_admin',

  _digits(s) { return (s || '').replace(/\D/g, ''); },

  isAdminValue(input) {
    const d = this._digits(input);
    return d.length >= 10 && (ACCESS_CONFIG.adminPhones || []).some(p => this._digits(p) === d);
  },

  isAdmin() { return this.isAdminValue(localStorage.getItem(this.ADMIN_KEY)); },

  grantAdmin(input) {
    if (!this.isAdminValue(input)) return false;
    localStorage.setItem(this.ADMIN_KEY, this._digits(input));
    localStorage.setItem(this.KEY, 'granted');
    this._ensureUser();          // so app.html doesn't bounce to the landing page
    return true;
  },

  // Make sure a profile exists so the app loads (app.js redirects out when there's none).
  _ensureUser() {
    try {
      if (localStorage.getItem('arena248_user')) return;
      const now = Date.now();
      localStorage.setItem('arena248_user', JSON.stringify({
        id: 'admin_' + now, phone: localStorage.getItem(this.ADMIN_KEY) || 'admin',
        name: 'Admin', avatar: '👑', createdAt: now,
        stats: { totalAnswered: 0, totalCorrect: 0, streak: 0, bestStreak: 0, xp: 0, level: 1,
          rank: 'Apprentice', categoryStats: {}, battlePassLevel: 0, badges: [],
          titles: ['Apprentice'], activeTitle: 'Apprentice', dailyXP: 0,
          dailyDate: new Date().toDateString(), weeklyChallenge: null, lootDrops: 0 }
      }));
    } catch (e) {}
  },

  hasAccess() {
    if (this.isAdmin()) return true;                     // admin always in
    if (ACCESS_CONFIG.mode === 'off' || ACCESS_CONFIG.mode === 'cloudflare') return true;
    if (ACCESS_CONFIG.mode === 'code') {
      return localStorage.getItem(this.KEY) === 'granted';
    }
    return false;
  },

  grantByCode(input) {
    // An admin phone entered in the code field unlocks admin mode.
    if (this.grantAdmin(input)) return true;
    const ok = (input || '').trim() === ACCESS_CONFIG.accessCode &&
               ACCESS_CONFIG.accessCode !== 'SET_YOUR_CODE_HERE';
    if (ok) localStorage.setItem(this.KEY, 'granted');
    return ok;
  },

  // Honor ?admin=<number> in the URL to unlock admin on this device once.
  _checkUrlAdmin() {
    try {
      const p = new URLSearchParams(window.location.search).get('admin');
      if (p) this.grantAdmin(p);
    } catch (e) {}
  },

  revoke() { localStorage.removeItem(this.KEY); localStorage.removeItem(this.ADMIN_KEY); },

  // Blocks the page with a paywall overlay if the visitor has no access.
  enforce() {
    this._checkUrlAdmin();
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

// Unlock admin from ?admin=<number> immediately (this script is in <head>, so it runs
// before app.js reads the session — prevents the redirect-to-landing bounce).
Subscription._checkUrlAdmin();
// Re-establish the profile for any persisted admin session (e.g. after Exit cleared only
// the profile but left the admin key), so app.js doesn't redirect a returning admin.
if (Subscription.isAdmin()) Subscription._ensureUser();

// Auto-enforce as soon as the page is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Subscription.enforce());
} else {
  Subscription.enforce();
}
