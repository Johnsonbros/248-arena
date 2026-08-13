// 248 Arena — Pulse
// -----------------------------------------------------------------------------
// The benchmark for the thing that actually decides whether this product works:
// is studying here FUN enough that people come back on the days nobody makes
// them? Retention follows fun; revenue follows retention. So Pulse measures fun
// two ways:
//
//   1. Revealed preference — the session ledger. Days active, sessions beyond
//      what Today's Plan asked for, variety of modes played. What people DO.
//   2. Stated preference — a one-tap 😩/😐/🔥 rating after some sessions.
//      What people SAY, at the moment they feel it, at zero effort.
//
// Both roll into a 0–100 Fun Index per player, and (in server mode) each rating
// ships to /api/pulse so the owner can see ratings by mode across ALL players —
// the improvement benchmark: change a mode, watch its rating and replay rate
// move. No tracking pixels, no third parties; the payload is the session's own
// stats plus the tap, tied to the same email everything else already uses.

const Pulse = {
  KEY: 'arena248_pulse',
  MAX_SESSIONS: 200,
  RATE_EVERY: 3,          // ask at most every 3rd session…
  RATE_MIN_GAP_MS: 20 * 60 * 60 * 1000,  // …and at most once a day

  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) {}
    if (!d || typeof d !== 'object') d = {};
    if (!Array.isArray(d.sessions)) d.sessions = [];
    if (!Array.isArray(d.ratings)) d.ratings = [];
    if (typeof d.sinceAsk !== 'number') d.sinceAsk = 0;
    return d;
  },

  save(d) {
    d.sessions = d.sessions.slice(-this.MAX_SESSIONS);
    d.ratings = d.ratings.slice(-50);
    try { localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) {}
  },

  // Called from the results screen — one row per finished session.
  record(results) {
    const d = this.load();
    d.sessions.push({
      ts: Date.now(),
      mode: results.mode,
      accuracy: results.accuracy,
      answered: results.answered,
      durMs: results.time || 0
    });
    d.sinceAsk++;
    this.save(d);
  },

  // Should the results screen ask for a rating right now?
  shouldAsk() {
    const d = this.load();
    const lastAsk = d.lastAskTs || 0;
    return d.sinceAsk >= this.RATE_EVERY && (Date.now() - lastAsk) >= this.RATE_MIN_GAP_MS;
  },

  // The one-tap prompt, injected into the results screen.
  promptHtml() {
    if (!this.shouldAsk()) return '';
    // Mark asked immediately — an ignored prompt shouldn't re-nag next session.
    const d = this.load();
    d.sinceAsk = 0;
    d.lastAskTs = Date.now();
    this.save(d);
    return `
      <div id="pulseAsk" style="margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;">
        <div style="color:#9898b0;font-size:0.85rem;margin-bottom:8px;">How was that session?</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          ${[['1', '😩'], ['2', '😐'], ['3', '🔥']].map(([v, e]) =>
            `<button onclick="Pulse.rate(${v})" style="font-size:1.5rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:8px 18px;cursor:pointer;">${e}</button>`
          ).join('')}
        </div>
      </div>`;
  },

  rate(value) {
    const d = this.load();
    const last = d.sessions[d.sessions.length - 1] || {};
    const row = { ts: Date.now(), rating: value, mode: last.mode || null, accuracy: last.accuracy ?? null };
    d.ratings.push(row);
    this.save(d);
    const el = document.getElementById('pulseAsk');
    if (el) el.innerHTML = `<div style="color:#00ff88;font-size:0.9rem;text-align:center;">Thanks — that steers what we build. ⚔️</div>`;
    // Ship to the fleet-wide benchmark when signed in; drop silently otherwise.
    try {
      if (window.CloudSync && CloudSync.enabled()) {
        fetch(`${ACCESS_CONFIG.apiBase}/api/pulse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: CloudSync.email(), ...row, answered: last.answered ?? null, durMs: last.durMs ?? null })
        }).catch(() => {});
      }
    } catch (e) {}
  },

  // --- The Fun Index (0–100) --------------------------------------------------
  // Four components, all from behavior the ledger already has:
  //   frequency (40) — distinct active days in the last 7
  //   volume    (20) — sessions in the last 7 days, capped at one credit/day
  //   variety   (20) — distinct modes played in the last 14 days (of 4+)
  //   verdict   (20) — average of the last 10 stated ratings
  // A player grinding one mode daily but rating it 😩 scores ~65 not 100 —
  // exactly the signal that keeps "engagement" honest about fun.
  funIndex() {
    const d = this.load();
    const now = Date.now();
    const day = 86400000;
    const in7 = d.sessions.filter(s => now - s.ts < 7 * day);
    const in14 = d.sessions.filter(s => now - s.ts < 14 * day);
    const days7 = new Set(in7.map(s => Math.floor(s.ts / day))).size;
    const modes14 = new Set(in14.map(s => s.mode)).size;
    const recent = d.ratings.slice(-10);
    const avgRating = recent.length ? recent.reduce((a, r) => a + r.rating, 0) / recent.length : null;
    const frequency = (days7 / 7) * 40;
    const volume = (Math.min(in7.length, 7) / 7) * 20;
    const variety = (Math.min(modes14, 4) / 4) * 20;
    // No ratings yet → neutral half-credit rather than a penalty.
    const verdict = avgRating == null ? 10 : ((avgRating - 1) / 2) * 20;
    return {
      score: Math.round(frequency + volume + variety + verdict),
      components: {
        frequency: Math.round(frequency), volume: Math.round(volume),
        variety: Math.round(variety), verdict: Math.round(verdict)
      },
      sessions7: in7.length, days7, modes14, avgRating
    };
  }
};

window.Pulse = Pulse;
