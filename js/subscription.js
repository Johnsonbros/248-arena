// 248 Arena — Access Gate
// -----------------------------------------------------------------------------
// Controls who gets into the paid app. Modes:
//
//   mode: 'server'      (RECOMMENDED once the arena-access service is deployed)
//       Access is verified against the arena-access API (deploy/access-service),
//       which is kept current by Stripe webhooks. Cross-device: subscribers
//       unlock with the email they paid with; welcome.html verifies the real
//       Stripe Checkout Session. Grants re-verify in the background every 24h,
//       so canceled subscriptions lose access within a day.
//
//   mode: 'code'        (lean fallback — client-side, per-device, bypassable)
//       A shared access code unlocks the device. welcome.html grants on visit.
//
//   mode: 'cloudflare'  Pass-through; Cloudflare Access does the blocking at the edge.
//   mode: 'off'         Everyone in (local development only).
//
// Admin: phones in adminPhones get full access everywhere (?admin=<number> once,
// or type the number into the paywall field). Client-side convenience, not
// high-security — move admin auth server-side when real accounts land.

const ACCESS_CONFIG = {
  mode: 'code',                       // switch to 'server' after deploying deploy/access-service
  apiBase: 'https://arena-api.thejohnsonbros.com',   // arena-access service URL (server mode)
  examinerBase: 'https://arena-ai.thejohnsonbros.com', // arena-examiner AI tutor (empty = disabled)
  accessCode: 'SET_YOUR_CODE_HERE',   // used only in 'code' mode
  pricingUrl: 'pricing.html',
  billingPortalUrl: 'https://billing.stripe.com/p/login/14A00cbKX2s430HbVO0sU00',
  adminPhones: ['6176868763']
};

const Subscription = {
  KEY: 'arena248_access',        // code-mode device grant
  GRANT_KEY: 'arena248_grant',   // server-mode grant: { email, active, checkedAt }
  ADMIN_KEY: 'arena248_admin',
  RECHECK_MS: 24 * 60 * 60 * 1000,

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
    this._ensureUser();
    return true;
  },

  // Make sure a profile exists so the app loads (app.js redirects out when there's none).
  _ensureUser(name, avatar) {
    try {
      if (localStorage.getItem('arena248_user')) return;
      const now = Date.now();
      localStorage.setItem('arena248_user', JSON.stringify({
        id: 'user_' + now, phone: 'none',
        name: name || 'Fighter', avatar: avatar || '⚔️', createdAt: now,
        stats: { totalAnswered: 0, totalCorrect: 0, streak: 0, bestStreak: 0, xp: 0, level: 1,
          rank: 'Apprentice', categoryStats: {}, battlePassLevel: 0, badges: [],
          titles: ['Apprentice'], activeTitle: 'Apprentice', dailyXP: 0,
          dailyDate: new Date().toDateString(), weeklyChallenge: null, lootDrops: 0 }
      }));
    } catch (e) {}
  },

  _getGrant() {
    try { return JSON.parse(localStorage.getItem(this.GRANT_KEY)); } catch (e) { return null; }
  },

  _setGrant(email, active) {
    localStorage.setItem(this.GRANT_KEY, JSON.stringify({ email, active, checkedAt: Date.now() }));
  },

  hasAccess() {
    if (this.isAdmin()) return true;
    if (ACCESS_CONFIG.mode === 'off' || ACCESS_CONFIG.mode === 'cloudflare') return true;
    if (ACCESS_CONFIG.mode === 'code') {
      return localStorage.getItem(this.KEY) === 'granted';
    }
    if (ACCESS_CONFIG.mode === 'server') {
      const g = this._getGrant();
      if (!g || !g.active) return false;
      // Allow immediately; silently re-verify when the grant is stale.
      if (Date.now() - (g.checkedAt || 0) > this.RECHECK_MS) this._refreshGrant(g.email);
      return true;
    }
    return false;
  },

  // --- server mode -----------------------------------------------------------
  async grantByEmail(email) {
    const e = (email || '').trim().toLowerCase();
    if (!e.includes('@')) return false;
    try {
      const res = await fetch(`${ACCESS_CONFIG.apiBase}/api/access?email=${encodeURIComponent(e)}`);
      const body = await res.json();
      if (body && body.active) { this._setGrant(e, true); this._ensureUser(); return true; }
    } catch (err) {}
    return false;
  },

  // Magic-link sign-in. Returns 'sent' (email on its way), 'fallback' (server
  // has no mailer — use plain email unlock), or false (bad input).
  async requestLogin(email) {
    const e = (email || '').trim().toLowerCase();
    if (!e.includes('@')) return false;
    try {
      const res = await fetch(`${ACCESS_CONFIG.apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e })
      });
      if (res.status === 501) return 'fallback';
      const body = await res.json();
      return body && body.sent ? 'sent' : 'fallback';
    } catch (err) { return 'fallback'; }
  },

  // Consume ?login=<token> from a magic-link email.
  async _checkUrlLogin() {
    try {
      const token = new URLSearchParams(window.location.search).get('login');
      if (!token) return;
      const res = await fetch(`${ACCESS_CONFIG.apiBase}/api/login/verify?token=${encodeURIComponent(token)}`);
      const body = await res.json();
      if (body && body.ok && body.email) {
        this._setGrant(body.email, true);
        this._ensureUser();
      }
      // Clean the token out of the URL either way (it's single-use).
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      history.replaceState(null, '', url.toString());
    } catch (e) {}
  },

  // welcome.html calls this with Stripe's {CHECKOUT_SESSION_ID} — verifies the
  // real session with Stripe before granting anything.
  async grantBySession(sessionId) {
    try {
      const res = await fetch(`${ACCESS_CONFIG.apiBase}/api/checkout-session?id=${encodeURIComponent(sessionId)}`);
      const body = await res.json();
      if (body && body.active && body.email) { this._setGrant(body.email, true); this._ensureUser(); return true; }
    } catch (err) {}
    return false;
  },

  async _refreshGrant(email) {
    try {
      const res = await fetch(`${ACCESS_CONFIG.apiBase}/api/access?email=${encodeURIComponent(email)}`);
      const body = await res.json();
      if (body && body.active) { this._setGrant(email, true); return; }
      // Revoked (canceled subscription): drop the grant and re-gate.
      localStorage.removeItem(this.GRANT_KEY);
      if (!this.isAdmin()) location.reload();
    } catch (err) { /* offline — keep existing grant until next check */ }
  },

  // --- unlock from the paywall input (admin phone, access code, or email) ----
  // Returns true (unlocked), false (rejected), or 'sent' (magic link emailed).
  async grantByInput(input) {
    if (this.grantAdmin(input)) return true;
    const v = (input || '').trim();
    if (ACCESS_CONFIG.mode === 'server' && v.includes('@')) {
      // Prefer verified sign-in when the server has a mailer; otherwise plain unlock.
      const login = await this.requestLogin(v);
      if (login === 'sent') return 'sent';
      return this.grantByEmail(v);
    }
    const ok = v === ACCESS_CONFIG.accessCode && ACCESS_CONFIG.accessCode !== 'SET_YOUR_CODE_HERE';
    if (ok) localStorage.setItem(this.KEY, 'granted');
    return ok;
  },

  // Back-compat alias (older pages call grantByCode).
  grantByCode(input) { return this.grantByInput(input); },

  _checkUrlAdmin() {
    try {
      const p = new URLSearchParams(window.location.search).get('admin');
      if (p) this.grantAdmin(p);
    } catch (e) {}
  },

  revoke() {
    localStorage.removeItem(this.KEY);
    localStorage.removeItem(this.GRANT_KEY);
    localStorage.removeItem(this.ADMIN_KEY);
  },

  enforce() {
    this._checkUrlAdmin();
    if (this.hasAccess()) return;
    this._renderPaywall();
  },

  _renderPaywall() {
    const serverMode = ACCESS_CONFIG.mode === 'server';
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
          <p style="color:#9898b0;font-size:0.85rem;margin-bottom:10px;">${serverMode
            ? 'Already subscribed? Enter the email you subscribed with:'
            : 'Already subscribed? Enter your access code:'}</p>
          <input id="arena-access-code" type="${serverMode ? 'email' : 'text'}"
            placeholder="${serverMode ? 'you@example.com' : 'Access code'}"
            style="width:100%;padding:11px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:#fff;text-align:center;margin-bottom:10px;">
          <button id="arena-access-btn"
            style="width:100%;padding:11px;border-radius:8px;border:1px solid rgba(0,212,255,0.4);
            background:transparent;color:#00d4ff;font-family:'Rajdhani',sans-serif;font-weight:700;
            letter-spacing:1px;cursor:pointer;">UNLOCK</button>
          <p id="arena-access-err" style="color:#ff2d55;font-size:0.8rem;margin-top:8px;display:none;">${serverMode
            ? "We couldn't find an active subscription for that email. Use the email from your Stripe receipt, or start a free trial above."
            : "That code isn't valid. Check your welcome email."}</p>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const btn = overlay.querySelector('#arena-access-btn');
    const input = overlay.querySelector('#arena-access-code');
    const err = overlay.querySelector('#arena-access-err');
    const tryUnlock = async () => {
      btn.textContent = 'CHECKING…';
      const ok = await this.grantByInput(input.value);
      btn.textContent = 'UNLOCK';
      if (ok === 'sent') {
        err.style.display = 'block';
        err.style.color = '#00ff88';
        err.textContent = '📬 Check your email — we sent you a one-tap sign-in link (it expires in 15 minutes).';
      } else if (ok) {
        overlay.remove();
        document.body.style.overflow = '';
        if (!document.getElementById('userName') || location.pathname.endsWith('app.html')) location.reload();
      } else {
        err.style.display = 'block';
      }
    };
    btn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
  }
};

window.Subscription = Subscription;

// Unlock admin from ?admin=<number> immediately (runs from <head>, before app.js).
Subscription._checkUrlAdmin();
// Re-establish the profile for any persisted admin session (e.g. after Exit).
if (Subscription.isAdmin()) Subscription._ensureUser();

// Auto-enforce only on the gated app page — other pages (welcome, pricing) load
// this script for its helpers without being paywalled themselves.
const ARENA_SHOULD_ENFORCE = /app\.html$/.test(location.pathname) || window.ARENA_ENFORCE === true;
if (ARENA_SHOULD_ENFORCE) {
  const go = async () => {
    // A magic-link token must be consumed BEFORE the gate decides.
    if (new URLSearchParams(location.search).get('login')) await Subscription._checkUrlLogin();
    Subscription.enforce();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
}
