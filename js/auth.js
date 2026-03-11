// 248 Arena — Auth Module

const Auth = {
  USER_KEY: 'arena248_user',
  SESSION_KEY: 'arena248_session',

  init() {
    return this.getUser();
  },

  getUser() {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        document.cookie = `${this.SESSION_KEY}=${user.id};path=/;max-age=${60*60*24*365}`;
        return user;
      }
      const cookie = document.cookie.split(';').find(c => c.trim().startsWith(this.SESSION_KEY + '='));
      if (cookie) {
        return { id: cookie.split('=')[1].trim(), phone: 'returning', name: 'Returning Fighter', avatar: '⚔️',
          stats: { totalAnswered: 0, totalCorrect: 0, streak: 0, bestStreak: 0, xp: 0, level: 1,
            rank: 'Apprentice', categoryStats: {}, battlePassLevel: 0, badges: [],
            titles: ['Apprentice'], activeTitle: 'Apprentice', dailyXP: 0,
            dailyDate: new Date().toDateString(), weeklyChallenge: null, lootDrops: 0 }};
      }
    } catch(e) {}
    return null;
  },

  createUser(phone, name, avatar) {
    const user = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      phone, name: name || 'Apprentice', avatar: avatar || '⚔️',
      createdAt: Date.now(),
      stats: {
        totalAnswered: 0, totalCorrect: 0, streak: 0, bestStreak: 0,
        xp: 0, level: 1, rank: 'Apprentice', categoryStats: {},
        battlePassLevel: 0, badges: [], titles: ['Apprentice'],
        activeTitle: 'Apprentice', dailyXP: 0,
        dailyDate: new Date().toDateString(), weeklyChallenge: null, lootDrops: 0
      }
    };
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    document.cookie = `${this.SESSION_KEY}=${user.id};path=/;max-age=${60*60*24*365}`;
    return user;
  },

  updateUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(this.USER_KEY);
    document.cookie = `${this.SESSION_KEY}=;path=/;max-age=0`;
  },

  XP_PER_LEVEL: 500,
  
  addXP(user, amount) {
    user.stats.xp += amount;
    if (user.stats.dailyDate !== new Date().toDateString()) {
      user.stats.dailyXP = 0;
      user.stats.dailyDate = new Date().toDateString();
    }
    user.stats.dailyXP += amount;
    const newLevel = Math.floor(user.stats.xp / this.XP_PER_LEVEL) + 1;
    if (newLevel > user.stats.level) {
      user.stats.level = newLevel;
      this.checkBadges(user);
    }
    this.updateUser(user);
    return user;
  },

  RANKS: [
    { level: 1, name: 'Apprentice' },
    { level: 5, name: 'Pipe Rookie' },
    { level: 10, name: 'Code Fighter' },
    { level: 15, name: 'Drain Warrior' },
    { level: 20, name: 'Pipe Wizard' },
    { level: 30, name: 'Backflow Boss' },
    { level: 40, name: 'Arena Champion' },
    { level: 50, name: 'Code Master' },
    { level: 75, name: 'Plumbing Legend' },
    { level: 100, name: 'Grand Master Plumber' }
  ],

  BADGES: [
    { id: 'first_blood', name: 'First Blood', icon: '🩸', desc: 'Answer your first question', check: s => s.totalAnswered >= 1 },
    { id: 'streak_5', name: 'Hot Streak', icon: '🔥', desc: '5 correct in a row', check: s => s.bestStreak >= 5 },
    { id: 'streak_10', name: 'On Fire', icon: '💥', desc: '10 correct in a row', check: s => s.bestStreak >= 10 },
    { id: 'streak_25', name: 'Unstoppable', icon: '⚡', desc: '25 correct in a row', check: s => s.bestStreak >= 25 },
    { id: 'hundred', name: 'Century Club', icon: '💯', desc: 'Answer 100 questions', check: s => s.totalAnswered >= 100 },
    { id: 'five_hundred', name: 'Grinder', icon: '⚙️', desc: 'Answer 500 questions', check: s => s.totalAnswered >= 500 },
    { id: 'perfect_10', name: 'Perfect 10', icon: '🎯', desc: '10 correct with no wrong', check: s => s.totalCorrect >= 10 && s.totalAnswered === s.totalCorrect },
    { id: 'all_categories', name: 'Well Rounded', icon: '🌐', desc: 'Answer in all categories', check: s => Object.keys(s.categoryStats).length >= 10 },
    { id: 'dwv_master', name: 'Drain King', icon: '👑', desc: '50 DWV questions right', check: s => (s.categoryStats.DWV?.correct || 0) >= 50 },
    { id: 'backflow_boss', name: 'Backflow Boss', icon: '🔄', desc: '30 backflow questions right', check: s => (s.categoryStats.BACKFLOW?.correct || 0) >= 30 },
    { id: 'gas_master', name: 'Gas Warrior', icon: '🔥', desc: '30 gas questions right', check: s => (s.categoryStats.GAS?.correct || 0) >= 30 },
    { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', desc: 'Score 3000+ in Speed Run', check: s => s.bestSpeedScore >= 3000 },
    { id: 'survivor', name: 'Survivor', icon: '🛡️', desc: 'Win Code Royale with all 3 lives', check: s => s.royalePerfect },
  ],

  checkBadges(user) {
    const newBadges = [];
    this.BADGES.forEach(badge => {
      if (!user.stats.badges.includes(badge.id) && badge.check(user.stats)) {
        user.stats.badges.push(badge.id);
        newBadges.push(badge);
      }
    });
    const rank = [...this.RANKS].reverse().find(r => user.stats.level >= r.level);
    if (rank) user.stats.rank = rank.name;
    const earnedTitles = ['Apprentice'];
    this.RANKS.forEach(r => { if (user.stats.level >= r.level) earnedTitles.push(r.name); });
    user.stats.titles = [...new Set(earnedTitles)];
    this.updateUser(user);
    return newBadges;
  }
};

window.Auth = Auth;
