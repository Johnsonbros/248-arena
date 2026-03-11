// 248 Arena — Game Modes Module

const GameModes = {
  currentMode: null, currentQuestions: [], currentIndex: 0,
  score: 0, correct: 0, streak: 0, startTime: 0,
  timeLimit: 0, eliminated: false, lives: 3,

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  getAdaptiveQuestions(count, user) {
    const questions = [...QUESTIONS];
    const stats = user?.stats?.categoryStats || {};
    const weighted = questions.map(q => {
      const catStat = stats[q.category];
      let weight = 1;
      if (catStat) {
        const accuracy = catStat.correct / (catStat.total || 1);
        weight = accuracy < 0.5 ? 3 : accuracy < 0.7 ? 2 : 1;
      } else { weight = 2; }
      return { q, weight };
    });
    const selected = [];
    const pool = [...weighted];
    while (selected.length < Math.min(count, pool.length) && pool.length > 0) {
      const totalWeight = pool.reduce((s, w) => s + w.weight, 0);
      let r = Math.random() * totalWeight;
      for (let i = 0; i < pool.length; i++) {
        r -= pool[i].weight;
        if (r <= 0) { selected.push(pool[i].q); pool.splice(i, 1); break; }
      }
    }
    return this.shuffle(selected);
  },

  start(mode, user) {
    this.currentMode = mode;
    this.currentIndex = 0; this.score = 0; this.correct = 0;
    this.streak = 0; this.eliminated = false; this.lives = 3;
    this.startTime = Date.now();
    switch(mode) {
      case 'practice': this.currentQuestions = this.getAdaptiveQuestions(20, user); this.timeLimit = 0; break;
      case 'ranked': this.currentQuestions = this.getAdaptiveQuestions(25, user); this.timeLimit = 0; break;
      case 'exam': this.currentQuestions = this.getAdaptiveQuestions(100, user); this.timeLimit = 120*60*1000; break;
      case 'royale': this.currentQuestions = this.getAdaptiveQuestions(30, user); this.timeLimit = 0; this.lives = 3; break;
      case 'speed': this.currentQuestions = this.getAdaptiveQuestions(25, user); this.timeLimit = 5*60*1000; break;
      case 'imposter': this.currentQuestions = this.generateImposterQuestions(15); this.timeLimit = 0; break;
    }
    return this.getCurrentQuestion();
  },

  getCurrentQuestion() {
    if (this.currentIndex >= this.currentQuestions.length) return null;
    const q = this.currentQuestions[this.currentIndex];
    return {
      ...q, number: this.currentIndex + 1, total: this.currentQuestions.length,
      isLoot: Math.random() < 0.1, mode: this.currentMode, score: this.score,
      streak: this.streak, lives: this.lives, elapsed: Date.now() - this.startTime,
      timeLimit: this.timeLimit
    };
  },

  answer(choiceIndex, user) {
    const q = this.currentQuestions[this.currentIndex];
    const isCorrect = choiceIndex === q.correct;
    const isLoot = Math.random() < 0.1;
    let pointsEarned = 0;
    if (isCorrect) {
      this.correct++; this.streak++;
      let base = q.difficulty === 3 ? 200 : q.difficulty === 2 ? 150 : 100;
      const multiplier = Math.min(this.streak, 10);
      pointsEarned = base * (1 + (multiplier - 1) * 0.25);
      if (isLoot) pointsEarned *= 5;
      if (this.currentMode === 'ranked') pointsEarned *= 1.5;
      if (this.currentMode === 'speed') pointsEarned *= 2;
      pointsEarned = Math.round(pointsEarned);
      this.score += pointsEarned;
      if (this.streak > (user?.stats?.bestStreak || 0)) user.stats.bestStreak = this.streak;
    } else {
      this.streak = 0;
      if (this.currentMode === 'royale') { this.lives--; if (this.lives <= 0) this.eliminated = true; }
    }
    if (user && this.currentMode !== 'practice') {
      user.stats.totalAnswered++;
      if (isCorrect) user.stats.totalCorrect++;
      user.stats.streak = this.streak;
      if (!user.stats.categoryStats[q.category]) user.stats.categoryStats[q.category] = { total: 0, correct: 0 };
      user.stats.categoryStats[q.category].total++;
      if (isCorrect) user.stats.categoryStats[q.category].correct++;
      Auth.addXP(user, isCorrect ? Math.round(pointsEarned / 10) : 5);
    }
    this.currentIndex++;
    const isComplete = this.currentIndex >= this.currentQuestions.length || this.eliminated;
    const result = {
      isCorrect, correctAnswer: q.correct, explanation: q.explanation,
      codeRef: q.codeRef, pointsEarned, streak: this.streak, isLoot,
      eliminated: this.eliminated, lives: this.lives, isComplete, question: q
    };
    if (isComplete) result.results = this.getResults(user);
    return result;
  },

  getResults(user, timedOut = false) {
    const elapsed = Date.now() - this.startTime;
    const results = {
      mode: this.currentMode, score: this.score, correct: this.correct,
      total: this.currentQuestions.length, answered: this.currentIndex,
      accuracy: this.currentIndex > 0 ? Math.round((this.correct / this.currentIndex) * 100) : 0,
      time: elapsed, timeFormatted: this.formatTime(elapsed),
      timedOut, eliminated: this.eliminated,
      xpEarned: Math.round(this.score / 10),
      newBadges: user ? Auth.checkBadges(user) : []
    };
    if (user && (this.currentMode === 'ranked' || this.currentMode === 'speed')) {
      Leaderboard.submitScore(user, this.currentMode, this.score, {
        correct: this.correct, total: this.currentIndex, time: elapsed
      });
    }
    return results;
  },

  formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    return `${m}:${String(s % 60).padStart(2,'0')}`;
  },

  getHint(user) {
    const q = this.currentQuestions[this.currentIndex];
    if (!q) return null;
    const cost = 50;
    this.score = Math.max(0, this.score - cost);
    const wrongOptions = q.options.map((o, i) => i).filter(i => i !== q.correct);
    const eliminated = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    return { hint: `Eliminated: "${q.options[eliminated]}"`, eliminatedIndex: eliminated, cost };
  },

  challenge() {
    return { message: 'Challenge submitted! If proven wrong, you earn 5x points.', active: true };
  },

  generateImposterQuestions(count) {
    const real = this.shuffle([...QUESTIONS]).slice(0, count);
    return real.map(q => {
      const fakes = [
        'Per 248 CMR 99.99, this is not regulated',
        'No code requirement exists for this scenario',
        'This is determined by the installer\'s preference',
        'The homeowner decides this, not the code',
        'This requirement was removed in the 2020 update'
      ];
      const fake = fakes[Math.floor(Math.random() * fakes.length)];
      const newOptions = [...q.options];
      const fakeIndex = Math.floor(Math.random() * (newOptions.length + 1));
      newOptions.splice(fakeIndex, 0, fake);
      let newCorrect = q.correct;
      if (fakeIndex <= q.correct) newCorrect++;
      return { ...q, options: newOptions, correct: newCorrect, imposterIndex: fakeIndex, isImposter: true };
    });
  },

  report(questionId, reason) {
    const reports = JSON.parse(localStorage.getItem('arena248_reports') || '[]');
    reports.push({ questionId, reason, date: Date.now() });
    localStorage.setItem('arena248_reports', JSON.stringify(reports));
  }
};

window.GameModes = GameModes;
