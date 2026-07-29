// 248 Arena — Cloud Sync (progress + leaderboard)
// -----------------------------------------------------------------------------
// Talks to the arena-access service when the gate runs in 'server' mode.
// - Progress (stats + spaced-repetition schedule) syncs per subscriber email,
//   so a cache clear or a new device no longer wipes months of study history.
// - Ranked/Speed scores submit to the real leaderboard.
// Everything degrades gracefully: offline or in 'code' mode, the app behaves
// exactly as before (local-only).

const CloudSync = {
  LAST_KEY: 'arena248_lastsync',
  _pushTimer: null,

  enabled() {
    try {
      return ACCESS_CONFIG.mode === 'server' && !!this.email();
    } catch (e) { return false; }
  },

  email() {
    try {
      const g = JSON.parse(localStorage.getItem('arena248_grant'));
      return g && g.active ? g.email : null;
    } catch (e) { return null; }
  },

  async _fetch(path, opts) {
    const res = await fetch(`${ACCESS_CONFIG.apiBase}${path}`, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // Pull server progress on app load. Adoption rule: the copy with more
  // answered questions wins — covers both "new device" (server wins) and
  // "server stale" (local wins, next push updates it).
  async pull(user) {
    if (!this.enabled()) return false;
    try {
      const data = await this._fetch(`/api/progress?email=${encodeURIComponent(this.email())}`);
      if (!data.found || !data.stats) return false;
      const serverAnswered = data.stats.totalAnswered || 0;
      const localAnswered = user?.stats?.totalAnswered || 0;
      if (serverAnswered > localAnswered) {
        user.stats = data.stats;
        // Identity travels with the account: adopt name/avatar on a new device.
        if (data.profile) {
          if (data.profile.name) user.name = data.profile.name;
          if (data.profile.avatar) user.avatar = data.profile.avatar;
        }
        Auth.updateUser(user);
        if (data.srs) localStorage.setItem('arena248_srs', JSON.stringify(data.srs));
        localStorage.setItem(this.LAST_KEY, String(Date.now()));
        return true; // caller should re-render
      }
    } catch (e) { /* offline or server not deployed — stay local */ }
    return false;
  },

  // Debounced push after study activity.
  push(user) {
    if (!this.enabled() || !user) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this._pushNow(user), 4000);
  },

  async _pushNow(user) {
    try {
      let srs = {};
      try { srs = JSON.parse(localStorage.getItem('arena248_srs')) || {}; } catch (e) {}
      await this._fetch('/api/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email(), stats: user.stats, srs,
          profile: { name: user.name, avatar: user.avatar }
        })
      });
      localStorage.setItem(this.LAST_KEY, String(Date.now()));
    } catch (e) { /* retry on next push */ }
  },

  async submitScore(user, mode, score, details) {
    if (!this.enabled()) return;
    try {
      await this._fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email(),
          name: user.name, avatar: user.avatar,
          title: user.stats.activeTitle || user.stats.rank, level: user.stats.level,
          mode, score,
          correct: details.correct || 0, total: details.total || 0, time: details.time || 0
        })
      });
    } catch (e) { /* score stays local-only this round */ }
  },

  // Fire-and-forget: send a question report to the owner's inbox.
  async reportQuestion(questionId, reason, questionText) {
    if (!this.enabled()) return;
    try {
      await this._fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email(), questionId, reason, question: questionText })
      });
    } catch (e) { /* stays in local reports only */ }
  },

  // period: weekly|monthly|all. Returns null when unavailable (caller falls
  // back to the local board).
  async leaderboard(period, mode) {
    if (!this.enabled()) return null;
    try {
      const email = encodeURIComponent(this.email());
      return await this._fetch(`/api/leaderboard?period=${period}&mode=${mode}&email=${email}`);
    } catch (e) { return null; }
  }
};

window.CloudSync = CloudSync;
