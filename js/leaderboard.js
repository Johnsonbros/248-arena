// 248 Arena — Leaderboard Module

const Leaderboard = {
  KEY: 'arena248_leaderboard',
  TOP_DISPLAY: 10,
  PAGE_SIZE: 25,

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch(e) { return []; }
  },

  save(entries) {
    localStorage.setItem(this.KEY, JSON.stringify(entries));
  },

  submitScore(user, mode, score, details = {}) {
    // Real leaderboard: submit to the server when cloud sync is on.
    if (window.CloudSync) CloudSync.submitScore(user, mode, score, details);
    const entries = this.getAll();
    entries.push({
      userId: user.id, name: user.name, avatar: user.avatar || '⚔️',
      phone: user.phone?.slice(-4) || '????',
      title: user.stats.activeTitle || user.stats.rank,
      level: user.stats.level, mode, score,
      correct: details.correct || 0, total: details.total || 0,
      time: details.time || 0, date: Date.now(),
      week: this.getWeekNumber(),
      month: new Date().getMonth() + '-' + new Date().getFullYear()
    });
    this.save(entries);
  },

  getWeekNumber() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d - start + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60000);
    return Math.ceil(diff / 604800000) + '-' + d.getFullYear();
  },

  getLeaderboard(tab = 'all', mode = 'ranked', page = 0, limit = null) {
    let entries = this.getAll().filter(e => e.mode === mode);
    
    if (tab === 'weekly') {
      const week = this.getWeekNumber();
      entries = entries.filter(e => e.week === week);
    } else if (tab === 'monthly') {
      const month = new Date().getMonth() + '-' + new Date().getFullYear();
      entries = entries.filter(e => e.month === month);
    }

    const byUser = {};
    entries.forEach(e => {
      if (!byUser[e.userId] || e.score > byUser[e.userId].score) byUser[e.userId] = e;
    });

    const sorted = Object.values(byUser).sort((a, b) => b.score - a.score);
    const pageSize = limit || this.PAGE_SIZE;
    const start = page * pageSize;
    return {
      entries: sorted.slice(start, start + pageSize),
      total: sorted.length,
      page,
      totalPages: Math.ceil(sorted.length / pageSize)
    };
  },

  getUserRank(userId, tab = 'all', mode = 'ranked') {
    let all = this.getAll().filter(e => e.mode === mode);
    if (tab === 'weekly') { const w = this.getWeekNumber(); all = all.filter(e => e.week === w); }
    else if (tab === 'monthly') { const m = new Date().getMonth() + '-' + new Date().getFullYear(); all = all.filter(e => e.month === m); }
    const byUser = {};
    all.forEach(e => { if (!byUser[e.userId] || e.score > byUser[e.userId].score) byUser[e.userId] = e; });
    const sorted = Object.values(byUser).sort((a, b) => b.score - a.score);
    const idx = sorted.findIndex(e => e.userId === userId);
    return idx >= 0 ? idx + 1 : null;
  },

  // The board is real now. seed() only cleans up fake demo entries left over
  // from earlier versions on returning users' devices.
  seed() {
    const entries = this.getAll();
    const cleaned = entries.filter(e => !String(e.userId || '').startsWith('demo_'));
    if (cleaned.length !== entries.length) this.save(cleaned);
  }
};

window.Leaderboard = Leaderboard;
