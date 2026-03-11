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

  seed() {
    if (this.getAll().length > 0) return;
    const names = [
      'PipeKing_Mike', 'DrainSlayer99', 'CodeWarrior_D', 'FluxMaster_J', 'CopperKid_T',
      'SolderSnake', 'BackflowBoss_S', 'WrenchWiz', 'TorchMaster', 'VentKing_K',
      'JointMaker_M', 'PipeDream_D', 'DrainBrain_J', 'FlameGod_P', 'CodeCrusher'
    ];
    const titles = ['Pipe Rookie', 'Code Fighter', 'Drain Warrior', 'Apprentice', 'Pipe Wizard'];
    const avatars = ['🔧', '⚡', '🔥', '💧', '🛡️', '⚔️', '🏆', '💀', '🐉', '👑'];
    const entries = [];
    names.forEach((name, i) => {
      entries.push({
        userId: 'demo_' + i, name, avatar: avatars[i % avatars.length],
        phone: String(1000 + Math.floor(Math.random() * 9000)),
        title: titles[Math.floor(Math.random() * titles.length)],
        level: Math.floor(Math.random() * 30) + 1, mode: 'ranked',
        score: Math.floor(Math.random() * 5000) + 500,
        correct: Math.floor(Math.random() * 50) + 10,
        total: Math.floor(Math.random() * 30) + 50, time: 0,
        date: Date.now() - Math.floor(Math.random() * 604800000),
        week: Leaderboard.getWeekNumber(),
        month: new Date().getMonth() + '-' + new Date().getFullYear()
      });
    });
    this.save(entries);
  }
};

window.Leaderboard = Leaderboard;
